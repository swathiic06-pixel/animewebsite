-- =========================================================
-- AnimeMax Database Schema & Row Level Security (RLS)
-- Supports Supabase + Clerk Third-Party Auth JWT Integration
-- =========================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. PRODUCTS TABLE
create table if not exists public.products (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    description text,
    price numeric not null check (price >= 0),
    category text not null,
    series text,
    edition text,
    color text,
    hw_num integer,
    image_url text,
    stock integer not null default 0 check (stock >= 0),
    in_stock boolean not null default true,
    display_section text not null default 'grid' check (display_section in ('hero', 'spotlight', 'favourites', 'grid')),
    sort_order integer not null default 0,
    created_at timestamp with time zone default now()
);

-- Index for category filtering, placement, and sorting
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_in_stock on public.products(in_stock);
create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_products_display_section on public.products(display_section);
create index if not exists idx_products_sort_order on public.products(sort_order asc);

-- 2. BUYER PROFILES TABLE
create table if not exists public.buyer_profiles (
    user_id text primary key, -- Clerk User ID (e.g. user_2X...)
    phone text,
    whatsapp text,
    address text,
    updated_at timestamp with time zone default now()
);

-- 3. ORDERS TABLE
create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    user_id text, -- Clerk User ID; nullable to allow guest checkout
    buyer_name text not null,
    buyer_phone text not null,
    buyer_whatsapp text not null, -- Used for manual UPI QR WhatsApp delivery
    buyer_address text not null,
    items jsonb not null, -- Array of { product_id, name, qty, price, image_url }
    total_amount numeric not null check (total_amount >= 0),
    status text not null default 'pending' check (status in ('pending', 'qr_sent', 'payment_confirmed', 'shipped', 'delivered', 'cancelled', 'replacement_requested', 'replacement_resolved')),
    cancelled_at timestamp with time zone,
    delivered_at timestamp with time zone,
    shiprocket_shipment_id text,
    tracking_number text,
    tracking_url text,
    label_url text,
    invoice_url text,
    created_at timestamp with time zone default now()
);

-- Index for buyer orders and owner query performance
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_cancelled_at on public.orders(cancelled_at);
create index if not exists idx_orders_delivered_at on public.orders(delivered_at);

-- 3b. ORDER ITEMS TABLE (Relational normalization)
create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id text not null references public.products(id) on delete cascade,
    quantity integer not null check (quantity > 0),
    price_at_purchase numeric not null check (price_at_purchase >= 0)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- 3c. REPLACEMENT REQUESTS TABLE (5-day post-delivery replacement requests)
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

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

alter table public.products enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.orders enable row level security;

-- Helper function to check if current request has owner role in Clerk JWT
create or replace function public.is_owner()
returns boolean as $$
begin
  return coalesce(
    (auth.jwt() ->> 'role') = 'owner' or
    (auth.jwt() -> 'public_metadata' ->> 'role') = 'owner' or
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner',
    false
  );
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- PRODUCTS POLICIES
-- ---------------------------------------------------------
drop policy if exists "Allow public read access to products" on public.products;
drop policy if exists "Allow owner full access to products" on public.products;

-- Public read: Anyone can browse products (guests & users)
create policy "Allow public read access to products"
    on public.products
    for select
    using (true);

-- Owner write: Only verified owner can insert, update, or delete products
create policy "Allow owner full access to products"
    on public.products
    for all
    using (public.is_owner())
    with check (public.is_owner());

-- ---------------------------------------------------------
-- BUYER PROFILES POLICIES
-- ---------------------------------------------------------
drop policy if exists "Allow buyers to read own profile or owner read all" on public.buyer_profiles;
drop policy if exists "Allow buyers to upsert own profile" on public.buyer_profiles;

-- Buyer read: signed-in buyer can only read their own profile; owner can read all
create policy "Allow buyers to read own profile or owner read all"
    on public.buyer_profiles
    for select
    using (
        (auth.jwt() ->> 'sub') = user_id
        or public.is_owner()
    );

-- Buyer write: signed-in buyer can insert/update their own profile
create policy "Allow buyers to upsert own profile"
    on public.buyer_profiles
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

-- ---------------------------------------------------------
-- ORDERS POLICIES
-- ---------------------------------------------------------
drop policy if exists "Allow anyone to insert orders" on public.orders;
drop policy if exists "Allow read access to orders" on public.orders;
drop policy if exists "Allow update access to orders" on public.orders;
drop policy if exists "Enable insert for users based on user_id" on public.orders;
drop policy if exists "Enable insert for authenticated users only" on public.orders;
drop policy if exists "Users can insert their own orders" on public.orders;

-- Anyone can place an order (guest checkout supported)
create policy "Allow anyone to insert orders"
    on public.orders
    for insert
    to public, anon, authenticated
    with check (true);

-- Buyers can read their own orders; owner can read all
create policy "Allow read access to orders"
    on public.orders
    for select
    to public, anon, authenticated
    using (
        user_id = (auth.jwt() ->> 'sub')
        OR (auth.jwt() ->> 'role') = 'owner'
        OR (auth.jwt() -> 'public_metadata' ->> 'role') = 'owner'
        OR public.is_owner()
    );

-- Only the owner can update order status
create policy "Allow update access to orders"
    on public.orders
    for update
    to public, anon, authenticated
    using (
        (auth.jwt() ->> 'role') = 'owner'
        OR (auth.jwt() -> 'public_metadata' ->> 'role') = 'owner'
        OR public.is_owner()
    )
    with check (
        (auth.jwt() ->> 'role') = 'owner'
        OR (auth.jwt() -> 'public_metadata' ->> 'role') = 'owner'
        OR public.is_owner()
    );

-- ---------------------------------------------------------
-- 4. HOMEPAGE BANNERS TABLE & POLICIES
-- ---------------------------------------------------------
create table if not exists public.homepage_banners (
    id uuid primary key default gen_random_uuid(),
    section text not null unique check (section in ('hero', 'weekly_drop', 'collector_spotlight', 'style_editorial')),
    image_url text,
    eyebrow_tag text,
    headline text not null,
    subtext text,
    cta_text text,
    cta_link text,
    updated_at timestamp with time zone default now()
);

-- Index for section lookups
create index if not exists idx_homepage_banners_section on public.homepage_banners(section);

-- Enable RLS
alter table public.homepage_banners enable row level security;

-- Public read access: Anyone can view homepage banners
drop policy if exists "Allow public read access to homepage_banners" on public.homepage_banners;
create policy "Allow public read access to homepage_banners"
    on public.homepage_banners
    for select
    to public, anon, authenticated
    using (true);

-- Owner write access: Only owner can insert or update banners
drop policy if exists "Allow owner write access to homepage_banners" on public.homepage_banners;
create policy "Allow owner write access to homepage_banners"
    on public.homepage_banners
    for all
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());

-- Seed initial rows if not present
insert into public.homepage_banners (section, eyebrow_tag, headline, subtext, cta_text, cta_link, image_url)
values
    ('hero', 'Exclusive Season Drop', 'GET UP TO 50% OFF', 'Authentic scale figures, heavy-weight embroidered hoodies, and holographic wall scrolls. Fresh Akihabara import shipments.', 'Get Discount', '#catalog-view', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80'),
    ('weekly_drop', 'Weekly Drop', 'New Arrivals — Fresh Drops Weekly', 'Curated street apparel & limited run art scrolls.', 'View Arrivals', '/?category=clothing', ''),
    ('collector_spotlight', 'Collector Spotlight', 'Demon Slayer Nichirin Swords & Statues', 'Official scale replica blades with zinc-alloy display stands.', 'Avail Offers', '/?category=accessories', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80'),
    ('style_editorial', 'Style Editorial', 'Bring Bold Fashion → Your Anime, Your Style', 'Heavyweight cotton hoodies, woven tapestry jackets, and Akatsuki cloaks crafted for fans who wear their passion boldly.', 'Shop Apparel Collection', '/?category=clothing', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80')
on conflict (section) do nothing;

-- ---------------------------------------------------------
-- 5. STORAGE BUCKET: homepage-banners
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('homepage-banners', 'homepage-banners', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access to Homepage Banners" on storage.objects;
create policy "Public Access to Homepage Banners"
    on storage.objects for select
    to public, anon, authenticated
    using (bucket_id = 'homepage-banners');

drop policy if exists "Allow upload to Homepage Banners" on storage.objects;
create policy "Allow upload to Homepage Banners"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'homepage-banners' AND public.is_owner());

drop policy if exists "Allow update on Homepage Banners" on storage.objects;
create policy "Allow update on Homepage Banners"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'homepage-banners' AND public.is_owner());