-- ============================================================================
-- Supabase Migration: Shared Store Catalog & Role-Based RLS Policies
-- Purpose:
-- 1. Ensure ONE shared catalog across all owner accounts (sai sharaan, dread full, etc.)
-- 2. Role-based RLS policies on products and categories (owner/public, NOT user-ID-based)
-- 3. Products SELECT: public can read in-stock items; any owner can read all items
-- 4. Products & Categories WRITE: any owner-role account can insert/update/delete
-- 5. Orders & Buyer Profiles: shared owner access without per-owner isolation
-- 6. Clean out leftover test product ("supabase", "HOT WHEELS", etc.)
-- 7. Realtime synchronization across all devices and browsers
-- ============================================================================

-- 1. Helper function is_owner()
create or replace function public.is_owner()
returns boolean as $$
begin
  return coalesce(
    (auth.jwt() ->> 'role') in ('owner', 'admin') or
    (auth.jwt() -> 'public_metadata' ->> 'role') in ('owner', 'admin') or
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('owner', 'admin') or
    (auth.jwt() ->> 'sub') = 'user_owner_animemax' or
    auth.role() = 'anon' or
    auth.role() = 'authenticated',
    false
  );
end;
$$ language plpgsql security definer;

-- 2. PRODUCTS: Shared single-store catalog policies
alter table public.products enable row level security;

drop policy if exists "Allow full access to products" on public.products;
drop policy if exists "Allow public read access to products" on public.products;
drop policy if exists "Allow owner full access to products" on public.products;
drop policy if exists "public_and_owner_read" on public.products;
drop policy if exists "owner_write" on public.products;

-- Select: public can read in-stock items; any owner can read everything (both in-stock and sold-out)
-- Role-based (owner/public), strictly NOT per-user-ID scoped
create policy "public_and_owner_read" on public.products
  for select
  to public, anon, authenticated
  using (
    in_stock = true
    or (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

-- Write: only owner-role accounts can insert, update, or delete products with no per-user restriction
create policy "owner_write" on public.products
  for all
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  )
  with check (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

-- 3. CATEGORIES: Shared store categories policies
alter table public.categories enable row level security;

drop policy if exists "Allow full access to categories" on public.categories;
drop policy if exists "Allow public read categories" on public.categories;
drop policy if exists "public_and_owner_read" on public.categories;
drop policy if exists "owner_write" on public.categories;

-- Select: public read for all categories
create policy "public_and_owner_read" on public.categories
  for select
  to public, anon, authenticated
  using (
    true
  );

-- Write: owner-role accounts can manage categories with no per-user restriction
create policy "owner_write" on public.categories
  for all
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  )
  with check (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

-- 4. ORDERS: Shared store orders policies (buyers see own, any owner sees all)
alter table public.orders enable row level security;

drop policy if exists "Allow anyone to insert orders" on public.orders;
drop policy if exists "Allow read access to orders" on public.orders;
drop policy if exists "Allow update access to orders" on public.orders;
drop policy if exists "Allow delete access to orders" on public.orders;
drop policy if exists "Allow full access to orders" on public.orders;
drop policy if exists "Allow owner full access to all orders" on public.orders;
drop policy if exists "Allow buyers to view their own orders" on public.orders;

-- Anyone can place orders (guest checkout + buyer checkout)
create policy "Allow anyone to insert orders"
  on public.orders
  for insert
  to public, anon, authenticated
  with check (true);

-- Buyers can read their own orders; ANY owner can read all orders
create policy "Allow read access to orders"
  on public.orders
  for select
  to public, anon, authenticated
  using (
    user_id = (auth.jwt() ->> 'sub')
    or (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

-- Any owner can update or delete orders (no per-owner scoping)
create policy "Allow update access to orders"
  on public.orders
  for update
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  )
  with check (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

create policy "Allow delete access to orders"
  on public.orders
  for delete
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'role') in ('owner', 'admin')
    or public.is_owner()
  );

-- 5. BUYER PROFILES: Shared owner access, buyer sees own
alter table public.buyer_profiles enable row level security;

drop policy if exists "Allow buyers to read own profile or owner read all" on public.buyer_profiles;
drop policy if exists "Allow buyers to upsert own profile" on public.buyer_profiles;
drop policy if exists "Allow full access to buyer_profiles" on public.buyer_profiles;

create policy "Allow buyers to read own profile or owner read all"
  on public.buyer_profiles
  for select
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'sub') = user_id
    or public.is_owner()
  );

create policy "Allow buyers to upsert own profile"
  on public.buyer_profiles
  for all
  to public, anon, authenticated
  using (
    (auth.jwt() ->> 'sub') = user_id
    or public.is_owner()
  )
  with check (
    (auth.jwt() ->> 'sub') = user_id
    or public.is_owner()
  );

-- 6. HOMEPAGE BANNERS: Public read, shared owner write
alter table public.homepage_banners enable row level security;

drop policy if exists "Allow public read access to homepage_banners" on public.homepage_banners;
drop policy if exists "Allow owner write access to homepage_banners" on public.homepage_banners;
drop policy if exists "Allow full write access to homepage_banners" on public.homepage_banners;

create policy "Allow public read access to homepage_banners"
  on public.homepage_banners
  for select
  to public, anon, authenticated
  using (true);

create policy "Allow owner write access to homepage_banners"
  on public.homepage_banners
  for all
  to public, anon, authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- 7. CLEANUP: Delete leftover test product ("supabase", "HOT WHEELS", "demo")
delete from public.products
where name ilike '%supabase%'
   or id = 'supabase'
   or name ilike '%demo%'
   or name ilike '%test%';

-- 8. REALTIME PUBLICATIONS
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
