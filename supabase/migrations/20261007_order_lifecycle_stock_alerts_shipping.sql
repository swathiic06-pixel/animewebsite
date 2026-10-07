-- ============================================================================
-- Supabase Migration: Order Lifecycle, Auto Stock, Replacement, Shipping & Invoicing
-- Features:
-- 1. Orders table: cancelled_at, delivered_at, shipping & invoice fields, updated status check
-- 2. Replacement requests table with 5-day post-delivery RLS
-- 3. order_items table with foreign keys to orders and products
-- 4. Automatic stock management & trigger for products.in_stock based on stock & manually_sold_out
-- 5. Atomic RPC: create_order_with_stock_decrement
-- 6. Server-side enforced RPC: cancel_order with 24-hr limit, status guard & stock restoration
-- 7. Realtime publications for order_items and replacement_requests
-- ============================================================================

-- 1. ORDERS TABLE EXTENSIONS
alter table public.orders add column if not exists cancelled_at timestamp with time zone;
alter table public.orders add column if not exists delivered_at timestamp with time zone;
alter table public.orders add column if not exists shiprocket_shipment_id text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists label_url text;
alter table public.orders add column if not exists invoice_url text;

-- Update status check constraint on orders
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in (
    'pending',
    'qr_sent',
    'payment_confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'replacement_requested',
    'replacement_resolved'
  )
);

create index if not exists idx_orders_cancelled_at on public.orders(cancelled_at);
create index if not exists idx_orders_delivered_at on public.orders(delivered_at);

-- 2. REPLACEMENT REQUESTS TABLE
create table if not exists public.replacement_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reason text not null,
  reference_image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'completed')),
  created_at timestamp with time zone default now()
);

create index if not exists idx_replacement_requests_order_id on public.replacement_requests(order_id);
create index if not exists idx_replacement_requests_status on public.replacement_requests(status);
create index if not exists idx_replacement_requests_created_at on public.replacement_requests(created_at desc);

alter table public.replacement_requests enable row level security;

drop policy if exists "replacement_requests_select" on public.replacement_requests;
create policy "replacement_requests_select" on public.replacement_requests
  for select to public, anon, authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = replacement_requests.order_id
        and (
          o.user_id = (auth.jwt() ->> 'sub')
          or (auth.jwt() ->> 'role') in ('owner', 'admin')
          or public.is_owner()
        )
    )
    or (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

drop policy if exists "replacement_requests_insert" on public.replacement_requests;
create policy "replacement_requests_insert" on public.replacement_requests
  for insert to public, anon, authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = replacement_requests.order_id
        and o.status in ('delivered', 'replacement_requested')
        and o.delivered_at is not null
        and (now() - o.delivered_at) <= interval '5 days'
    )
  );

drop policy if exists "replacement_requests_update" on public.replacement_requests;
create policy "replacement_requests_update" on public.replacement_requests
  for update to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner()
  )
  with check (
    (auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner()
  );

drop policy if exists "replacement_requests_delete" on public.replacement_requests;
create policy "replacement_requests_delete" on public.replacement_requests
  for delete to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner()
  );

-- 3. ORDER ITEMS TABLE
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric not null check (price_at_purchase >= 0)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to public, anon, authenticated
  using (true);

drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items
  for insert to public, anon, authenticated
  with check (true);

drop policy if exists "order_items_update" on public.order_items;
create policy "order_items_update" on public.order_items
  for update to public, anon, authenticated
  using ((auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner());

drop policy if exists "order_items_delete" on public.order_items;
create policy "order_items_delete" on public.order_items
  for delete to public, anon, authenticated
  using ((auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner());

-- 4. PRODUCTS COLUMNS & AUTO IN_STOCK TRIGGER
alter table public.products add column if not exists manually_sold_out boolean not null default false;
alter table public.products add column if not exists low_stock_threshold integer not null default 2;

create or replace function public.trg_compute_product_in_stock()
returns trigger as $$
begin
  new.in_stock := (new.stock > 0 and not coalesce(new.manually_sold_out, false));
  return new;
end;
$$ language plpgsql;

drop trigger if exists compute_product_in_stock_trigger on public.products;
create trigger compute_product_in_stock_trigger
  before insert or update of stock, manually_sold_out on public.products
  for each row
  execute function public.trg_compute_product_in_stock();

-- Ensure all existing rows have valid in_stock computation
update public.products
set in_stock = (stock > 0 and not coalesce(manually_sold_out, false));

-- 5. ATOMIC RPC: create_order_with_stock_decrement
create or replace function public.create_order_with_stock_decrement(
  p_order_id uuid,
  p_user_id text,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_whatsapp text,
  p_buyer_address text,
  p_total_amount numeric,
  p_items jsonb
)
returns jsonb as $$
declare
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_price numeric;
  v_created_order public.orders;
  v_order_id uuid;
begin
  v_order_id := coalesce(p_order_id, gen_random_uuid());

  -- 1. Insert order record (retaining items JSONB for backwards compatibility)
  insert into public.orders (
    id,
    user_id,
    buyer_name,
    buyer_phone,
    buyer_whatsapp,
    buyer_address,
    items,
    total_amount,
    status,
    created_at
  )
  values (
    v_order_id,
    p_user_id,
    p_buyer_name,
    p_buyer_phone,
    p_buyer_whatsapp,
    p_buyer_address,
    p_items,
    p_total_amount,
    'pending',
    now()
  )
  returning * into v_created_order;

  -- 2. Process each line item: insert into order_items and decrement product stock
  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_product_id := coalesce(v_item ->> 'product_id', v_item ->> 'id');
      v_qty := coalesce((v_item ->> 'qty')::integer, (v_item ->> 'quantity')::integer, 1);
      v_price := coalesce((v_item ->> 'price')::numeric, 0);

      if v_product_id is not null then
        -- Insert into order_items table
        insert into public.order_items (
          order_id,
          product_id,
          quantity,
          price_at_purchase
        )
        values (
          v_order_id,
          v_product_id,
          v_qty,
          v_price
        );

        -- Atomically decrement stock
        update public.products
        set stock = greatest(0, stock - v_qty)
        where id = v_product_id;
      end if;
    end loop;
  end if;

  return to_jsonb(v_created_order);
end;
$$ language plpgsql security definer;

-- 6. SERVER-SIDE ENFORCED RPC: cancel_order
create or replace function public.cancel_order(
  p_order_id uuid,
  p_user_id text default null
)
returns jsonb as $$
declare
  v_order public.orders;
  v_hours numeric;
  v_oi record;
  v_item jsonb;
  v_pid text;
  v_qty integer;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Check if already cancelled
  if v_order.status = 'cancelled' then
    return to_jsonb(v_order);
  end if;

  -- Status guard: Only pending, qr_sent, or payment_confirmed can be cancelled
  if v_order.status not in ('pending', 'qr_sent', 'payment_confirmed') then
    raise exception 'Order cannot be cancelled in status "%". Dispatched or completed orders are non-cancellable.', v_order.status;
  end if;

  -- Server-side time enforcement: Must be within 24 hours of placement
  v_hours := extract(epoch from (now() - v_order.created_at)) / 3600.0;
  if v_hours >= 24.0 then
    raise exception 'Cancellation window has closed (must be within 24 hours of placing the order).';
  end if;

  -- Optional ownership verification if user_id is provided
  if p_user_id is not null and v_order.user_id is not null and v_order.user_id <> p_user_id then
    if not (public.is_owner() or (auth.jwt() ->> 'role') in ('owner', 'admin')) then
      raise exception 'Unauthorized to cancel this order.';
    end if;
  end if;

  -- Update order status and set cancelled_at timestamp
  update public.orders
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_order_id
  returning * into v_order;

  -- Atomically restore product stock
  if exists (select 1 from public.order_items where order_id = p_order_id) then
    for v_oi in select product_id, quantity from public.order_items where order_id = p_order_id
    loop
      update public.products
      set stock = stock + v_oi.quantity
      where id = v_oi.product_id;
    end loop;
  elsif v_order.items is not null then
    for v_item in select * from jsonb_array_elements(v_order.items)
    loop
      v_pid := coalesce(v_item ->> 'product_id', v_item ->> 'id');
      v_qty := coalesce((v_item ->> 'qty')::integer, (v_item ->> 'quantity')::integer, 1);
      if v_pid is not null then
        update public.products
        set stock = stock + v_qty
        where id = v_pid;
      end if;
    end loop;
  end if;

  return to_jsonb(v_order);
end;
$$ language plpgsql security definer;

-- 7. REALTIME PUBLICATIONS
do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.replacement_requests;
exception when others then null;
end $$;
