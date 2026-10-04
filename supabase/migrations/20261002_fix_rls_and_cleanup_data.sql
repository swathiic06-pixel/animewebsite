-- ============================================================================
-- Supabase Migration: Full Access RLS Policies, Missing Columns & Clean Tables
-- Purpose: 
-- 1. Ensure all browsers can view, insert, update, and delete products & orders
-- 2. Add missing columns (display_section, sort_order, category_id, stock, etc.)
-- 3. Delete any placeholder products (hw-*, prod-00*) and demo orders
-- 4. Enable Supabase Realtime publication for instant cross-browser synchronization
-- ============================================================================

-- 1. Ensure Products table columns and extensions
alter table if exists public.products add column if not exists display_section text default 'grid';
alter table if exists public.products add column if not exists sort_order integer default 0;
alter table if exists public.products add column if not exists stock integer default 10;
alter table if exists public.products add column if not exists hw_num text;
alter table if exists public.products add column if not exists edition text;
alter table if exists public.products add column if not exists color text;
alter table if exists public.products add column if not exists category_id text;

-- 2. Clean out all placeholder / demo products and test orders
delete from public.products 
where id like 'hw-%' 
   or id like 'prod-00%' 
   or name like '%Demo%'
   or name like '%Test%';

delete from public.orders 
where id::text in ('ord-9042', 'ord-8711') 
   or buyer_name like '%Test%' 
   or buyer_name like '%Demo%';

-- 3. Ensure Categories table exists with real catalog categories
create table if not exists public.categories (
    id text primary key,
    name text not null,
    slug text not null unique,
    display_order integer not null default 0,
    icon text default 'sparkles',
    created_at timestamp with time zone default now()
);

insert into public.categories (id, name, slug, display_order, icon)
values
  ('cat-hot-wheels', 'Hot Wheels', 'hot-wheels', 1, 'car'),
  ('cat-die-cast', 'Die Cast', 'die-cast', 2, 'truck'),
  ('cat-marvel', 'Marvel', 'marvel', 3, 'bolt'),
  ('cat-anime', 'Anime', 'anime', 4, 'sparkles'),
  ('cat-posters-wall-decor', 'Posters & Wall Decor', 'posters-wall-decor', 5, 'image'),
  ('cat-katanas', 'Katanas', 'katanas', 6, 'sword'),
  ('cat-rc-cars', 'RC Cars', 'rc-cars', 7, 'car'),
  ('cat-shinchan', 'Shinchan', 'shinchan', 8, 'smile')
on conflict (slug) do update set
  name = excluded.name,
  display_order = excluded.display_order,
  icon = excluded.icon;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Allow anonymous/public clients full CRUD operations so Admin deletions,
-- additions, and status changes instantly persist across all browsers & devices.

-- Products
alter table public.products enable row level security;
drop policy if exists "Allow public read access to products" on public.products;
drop policy if exists "Allow owner full access to products" on public.products;
drop policy if exists "Allow full access to products" on public.products;
create policy "Allow full access to products"
    on public.products
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- Orders
alter table public.orders enable row level security;
drop policy if exists "Allow anyone to insert orders" on public.orders;
drop policy if exists "Allow read access to orders" on public.orders;
drop policy if exists "Allow update access to orders" on public.orders;
drop policy if exists "Allow delete access to orders" on public.orders;
drop policy if exists "Allow full access to orders" on public.orders;
create policy "Allow full access to orders"
    on public.orders
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- Categories
alter table public.categories enable row level security;
drop policy if exists "Allow public read categories" on public.categories;
drop policy if exists "Allow full access to categories" on public.categories;
create policy "Allow full access to categories"
    on public.categories
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- Buyer Profiles
alter table public.buyer_profiles enable row level security;
drop policy if exists "Allow buyers to read own profile or owner read all" on public.buyer_profiles;
drop policy if exists "Allow buyers to upsert own profile" on public.buyer_profiles;
drop policy if exists "Allow full access to buyer_profiles" on public.buyer_profiles;
create policy "Allow full access to buyer_profiles"
    on public.buyer_profiles
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- Homepage Banners
alter table public.homepage_banners enable row level security;
drop policy if exists "Allow public read access to homepage_banners" on public.homepage_banners;
drop policy if exists "Allow owner write access to homepage_banners" on public.homepage_banners;
drop policy if exists "Allow full write access to homepage_banners" on public.homepage_banners;
create policy "Allow full write access to homepage_banners"
    on public.homepage_banners
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- 5. Realtime Publication
-- Ensure live updates propagate immediately to all open browser windows
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when others then null;
end $$;
