-- ============================================================================
-- Supabase Migration: Amazon-Style Replacement Flow (Supersedes Part 2 table)
-- 
-- Features:
-- 1. replacement_requests table scoped to order_item_id with reason_category,
--    description, owner_note, tracking_number, resolved_at, shipped_at.
-- 2. replacement_request_images table with cascade delete and sort_order.
-- 3. RLS policies protecting buyer ownership and owner review privileges.
-- 4. Server-side eligibility function & atomic RPCs:
--    - is_replacement_eligible(order_id)
--    - submit_replacement_request(order_id, item_id, reason, desc, images, user_id)
--    - update_replacement_decision(request_id, status, owner_note, tracking_number)
-- 5. Backfill order_items for any historical orders lacking relational rows.
-- 6. Realtime publication wiring for live updates.
-- ============================================================================

-- 1. Ensure uuid extension is available
create extension if not exists "pgcrypto";

-- 2. BACKFILL ORDER_ITEMS FOR ANY PREVIOUS ORDERS
do $$
declare
  r_order record;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_price numeric;
begin
  for r_order in select id, items from public.orders where items is not null and jsonb_array_length(items) > 0 loop
    if not exists (select 1 from public.order_items where order_id = r_order.id) then
      for v_item in select * from jsonb_array_elements(r_order.items) loop
        v_product_id := coalesce(v_item ->> 'product_id', v_item ->> 'id');
        v_qty := coalesce((v_item ->> 'qty')::integer, (v_item ->> 'quantity')::integer, 1);
        v_price := coalesce((v_item ->> 'price')::numeric, 0);
        if v_product_id is not null then
          if exists (select 1 from public.products where id = v_product_id) then
            insert into public.order_items (order_id, product_id, quantity, price_at_purchase)
            values (r_order.id, v_product_id, v_qty, v_price);
          end if;
        end if;
      end loop;
    end if;
  end loop;
end $$;

-- 3. RECREATE REPLACEMENT_REQUESTS & REPLACEMENT_REQUEST_IMAGES TABLES
drop table if exists public.replacement_request_images cascade;
drop table if exists public.replacement_requests cascade;

create table public.replacement_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  reason_category text not null check (reason_category in (
    'damaged', 'wrong_item', 'defective', 'missing_parts', 'other'
  )),
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'shipped')),
  owner_note text,                      -- shown to the buyer alongside the decision
  tracking_number text,                 -- filled in once a replacement is shipped
  resolved_at timestamp with time zone, -- when approved/declined
  shipped_at timestamp with time zone,  -- when marked shipped
  created_at timestamp with time zone default now()
);

create table public.replacement_request_images (
  id uuid primary key default gen_random_uuid(),
  replacement_request_id uuid not null references public.replacement_requests(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

-- 4. INDEXES
create index if not exists idx_replacement_requests_order_id on public.replacement_requests(order_id);
create index if not exists idx_replacement_requests_order_item_id on public.replacement_requests(order_item_id);
create index if not exists idx_replacement_requests_status on public.replacement_requests(status);
create index if not exists idx_replacement_requests_created_at on public.replacement_requests(created_at desc);

create index if not exists idx_replacement_request_images_req_id on public.replacement_request_images(replacement_request_id);
create index if not exists idx_replacement_request_images_sort_order on public.replacement_request_images(replacement_request_id, sort_order);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.replacement_requests enable row level security;
alter table public.replacement_request_images enable row level security;

-- replacement_requests RLS
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
        and o.status = 'delivered'
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

-- replacement_request_images RLS
drop policy if exists "replacement_request_images_select" on public.replacement_request_images;
create policy "replacement_request_images_select" on public.replacement_request_images
  for select to public, anon, authenticated
  using (true);

drop policy if exists "replacement_request_images_insert" on public.replacement_request_images;
create policy "replacement_request_images_insert" on public.replacement_request_images
  for insert to public, anon, authenticated
  with check (
    exists (
      select 1 from public.replacement_requests rr
      where rr.id = replacement_request_images.replacement_request_id
    )
  );

drop policy if exists "replacement_request_images_update" on public.replacement_request_images;
create policy "replacement_request_images_update" on public.replacement_request_images
  for update to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner()
  );

drop policy if exists "replacement_request_images_delete" on public.replacement_request_images;
create policy "replacement_request_images_delete" on public.replacement_request_images
  for delete to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin') or public.is_owner()
  );

-- 6. SERVER-SIDE ELIGIBILITY CHECK HELPER
create or replace function public.is_replacement_eligible(p_order_id uuid)
returns boolean as $$
declare
  v_order record;
begin
  select status, delivered_at into v_order from public.orders where id = p_order_id;
  if not found then
    return false;
  end if;
  if v_order.status <> 'delivered' or v_order.delivered_at is null then
    return false;
  end if;
  return (extract(epoch from (now() - v_order.delivered_at)) / 86400.0) <= 5.0;
end;
$$ language plpgsql security definer;

-- 7. ATOMIC RPC: submit_replacement_request
create or replace function public.submit_replacement_request(
  p_order_id uuid,
  p_order_item_id uuid,
  p_reason_category text,
  p_description text,
  p_image_urls text[],
  p_user_id text default null
)
returns jsonb as $$
declare
  v_order record;
  v_order_item record;
  v_days numeric;
  v_req_id uuid;
  v_img text;
  v_idx integer := 0;
  v_result jsonb;
begin
  -- 1. Verify Order exists
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  -- 2. Verify ownership if user_id provided
  if p_user_id is not null and v_order.user_id is not null and v_order.user_id <> p_user_id then
    if not (public.is_owner() or (auth.jwt() ->> 'role') in ('owner', 'admin')) then
      raise exception 'Unauthorized: you can only request replacements for your own orders.';
    end if;
  end if;

  -- 3. Verify status is 'delivered'
  if v_order.status <> 'delivered' then
    raise exception 'Replacement requests are only available for delivered orders (current status: "%").', v_order.status;
  end if;

  -- 4. Verify 5-day delivery window
  if v_order.delivered_at is null then
    raise exception 'Delivery timestamp is missing for this order.';
  end if;

  v_days := extract(epoch from (now() - v_order.delivered_at)) / 86400.0;
  if v_days > 5.0 then
    raise exception 'Replacement eligibility window has closed (must be within 5 days of delivery).';
  end if;

  -- 5. Verify line item exists and belongs to this order
  select * into v_order_item from public.order_items where id = p_order_item_id and order_id = p_order_id;
  if not found then
    raise exception 'Selected line item was not found in this order.';
  end if;

  -- 6. Verify duplicate check
  if exists (select 1 from public.replacement_requests where order_item_id = p_order_item_id) then
    raise exception 'A replacement request has already been submitted for this item.';
  end if;

  -- 7. Verify reason category
  if p_reason_category not in ('damaged', 'wrong_item', 'defective', 'missing_parts', 'other') then
    raise exception 'Invalid reason category "%". Allowed categories: damaged, wrong_item, defective, missing_parts, other.', p_reason_category;
  end if;

  -- 8. Verify description
  if coalesce(trim(p_description), '') = '' then
    raise exception 'Please provide a description explaining the issue.';
  end if;

  -- 9. Verify photos (at least 1, max 5)
  if p_image_urls is null or array_length(p_image_urls, 1) is null or array_length(p_image_urls, 1) < 1 then
    raise exception 'At least one photo is required as evidence.';
  end if;
  if array_length(p_image_urls, 1) > 5 then
    raise exception 'A maximum of 5 photos can be attached per replacement request.';
  end if;

  -- 10. Insert replacement_requests record
  v_req_id := gen_random_uuid();
  insert into public.replacement_requests (
    id,
    order_id,
    order_item_id,
    reason_category,
    description,
    status,
    created_at
  )
  values (
    v_req_id,
    p_order_id,
    p_order_item_id,
    p_reason_category,
    trim(p_description),
    'pending',
    now()
  );

  -- 11. Insert replacement_request_images records
  foreach v_img in array p_image_urls loop
    if v_img is not null and trim(v_img) <> '' then
      insert into public.replacement_request_images (
        replacement_request_id,
        image_url,
        sort_order
      )
      values (
        v_req_id,
        trim(v_img),
        v_idx
      );
      v_idx := v_idx + 1;
    end if;
  end loop;

  -- 12. Return the created request object with images
  select jsonb_build_object(
    'id', rr.id,
    'order_id', rr.order_id,
    'order_item_id', rr.order_item_id,
    'reason_category', rr.reason_category,
    'description', rr.description,
    'status', rr.status,
    'created_at', rr.created_at,
    'images', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', rri.id,
        'image_url', rri.image_url,
        'sort_order', rri.sort_order
      ) order by rri.sort_order), '[]'::jsonb)
      from public.replacement_request_images rri
      where rri.replacement_request_id = rr.id
    )
  )
  into v_result
  from public.replacement_requests rr
  where rr.id = v_req_id;

  return v_result;
end;
$$ language plpgsql security definer;

-- 8. ATOMIC RPC: update_replacement_decision
create or replace function public.update_replacement_decision(
  p_request_id uuid,
  p_status text,
  p_owner_note text default null,
  p_tracking_number text default null
)
returns jsonb as $$
declare
  v_req record;
  v_result jsonb;
begin
  select * into v_req from public.replacement_requests where id = p_request_id;
  if not found then
    raise exception 'Replacement request not found';
  end if;

  if p_status not in ('approved', 'declined', 'shipped') then
    raise exception 'Invalid status "%". Status must be approved, declined, or shipped.', p_status;
  end if;

  if p_status in ('approved', 'declined') then
    update public.replacement_requests
    set status = p_status,
        owner_note = coalesce(p_owner_note, owner_note),
        resolved_at = coalesce(resolved_at, now())
    where id = p_request_id;
  elsif p_status = 'shipped' then
    if v_req.status <> 'approved' and v_req.status <> 'shipped' then
      raise exception 'Only approved replacement requests can be marked as shipped.';
    end if;
    update public.replacement_requests
    set status = 'shipped',
        tracking_number = coalesce(p_tracking_number, tracking_number),
        owner_note = coalesce(p_owner_note, owner_note),
        shipped_at = coalesce(shipped_at, now())
    where id = p_request_id;
  end if;

  select jsonb_build_object(
    'id', rr.id,
    'order_id', rr.order_id,
    'order_item_id', rr.order_item_id,
    'reason_category', rr.reason_category,
    'description', rr.description,
    'status', rr.status,
    'owner_note', rr.owner_note,
    'tracking_number', rr.tracking_number,
    'resolved_at', rr.resolved_at,
    'shipped_at', rr.shipped_at,
    'created_at', rr.created_at,
    'images', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', rri.id,
        'image_url', rri.image_url,
        'sort_order', rri.sort_order
      ) order by rri.sort_order), '[]'::jsonb)
      from public.replacement_request_images rri
      where rri.replacement_request_id = rr.id
    )
  )
  into v_result
  from public.replacement_requests rr
  where rr.id = p_request_id;

  return v_result;
end;
$$ language plpgsql security definer;

-- 9. REALTIME PUBLICATION
do $$
begin
  alter publication supabase_realtime add table public.replacement_requests;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.replacement_request_images;
exception when others then null;
end $$;
