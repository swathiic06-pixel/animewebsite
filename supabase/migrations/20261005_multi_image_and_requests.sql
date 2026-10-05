-- ============================================================================
-- Supabase Migration: Multi-Image Product Gallery & Product Requests
-- Purpose:
-- 1. Create product_images table with product_id foreign key, sort_order, is_cover
-- 2. Create product_requests table for buyer collectible/product requests
-- 3. Set RLS policies for product_images and product_requests
-- 4. Enable Supabase Realtime for instant synchronization
-- 5. Backfill existing product image_url into product_images as cover images
-- ============================================================================

-- 1. Product Images Table
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_product_images_sort_order on public.product_images (product_id, sort_order);

-- 2. Product Requests Table
create table if not exists public.product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text,                      -- Clerk user ID if signed in, null for guest requests
  product_name text,                 -- optional (either product_name or reference_image_url required)
  reference_image_url text,          -- optional, Cloudinary uploaded image URL
  status text not null default 'new' check (status in ('new', 'reviewing', 'fulfilled', 'declined')),
  created_at timestamp with time zone default now()
);

create index if not exists idx_product_requests_created_at on public.product_requests (created_at desc);

-- 3. Row Level Security (RLS) Policies
alter table public.product_images enable row level security;

drop policy if exists "Allow full access to product_images" on public.product_images;
create policy "Allow full access to product_images"
  on public.product_images
  for all
  to public, anon, authenticated
  using (true)
  with check (true);

alter table public.product_requests enable row level security;

drop policy if exists "Allow full access to product_requests" on public.product_requests;
create policy "Allow full access to product_requests"
  on public.product_requests
  for all
  to public, anon, authenticated
  using (true)
  with check (true);

-- 4. Realtime Publication
do $$
begin
  alter publication supabase_realtime add table public.product_images;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.product_requests;
exception when others then null;
end $$;

-- 5. Migration: Backfill existing product images into product_images table
insert into public.product_images (product_id, image_url, sort_order, is_cover)
select id, image_url, 0, true
from public.products
where image_url is not null and image_url != ''
and id not in (select distinct product_id from public.product_images);
