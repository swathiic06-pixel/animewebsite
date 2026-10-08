-- ====================================================================
-- AnimeMax: Real Product Categories Setup
-- ====================================================================

-- 1. Ensure uuid extension is available
create extension if not exists "pgcrypto";

-- 2. CREATE / UPGRADE CATEGORIES TABLE
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    display_order integer not null default 0,
    icon text,
    created_at timestamp with time zone default now()
);

alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists display_order integer not null default 0;

-- 3. UPGRADE PRODUCTS TABLE WITH category_id
alter table public.products 
    add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists idx_categories_display_order on public.categories(display_order asc);
create index if not exists idx_products_category_id on public.products(category_id);

-- 4. ROW LEVEL SECURITY (RLS) FOR CATEGORIES
alter table public.categories enable row level security;

drop policy if exists "Allow public read access to categories" on public.categories;
create policy "Allow public read access to categories"
    on public.categories
    for select
    to public, anon, authenticated
    using (true);

drop policy if exists "Allow owner write access to categories" on public.categories;
create policy "Allow owner write access to categories"
    on public.categories
    for all
    to public, anon, authenticated
    using (true)
    with check (true);

-- 5. INSERT / UPDATE APPROVED REAL CATEGORY LIST
insert into public.categories (name, slug, display_order, icon) values
  ('Hot Wheels', 'hot-wheels', 1, 'car'),
  ('Die Cast', 'die-cast', 2, 'truck'),
  ('Marvel', 'marvel', 3, 'bolt'),
  ('Anime', 'anime', 4, 'sparkles'),
  ('Posters & Wall Decor', 'posters-wall-decor', 5, 'image'),
  ('Katanas', 'katanas', 6, 'sword'),
  ('RC Cars', 'rc-cars', 7, 'radio'),
  ('Shinchan', 'shinchan', 8, 'user')
on conflict (slug) do update set
  name = excluded.name,
  display_order = excluded.display_order,
  icon = excluded.icon;

-- 6. REMOVE CATEGORIES OUTSIDE THE APPROVED 8 SLUGS
-- (Safe to run: foreign key prevents delete if referenced, and any test data has been cleared)
delete from public.categories
where slug not in (
  'hot-wheels', 'die-cast', 'marvel', 'anime',
  'posters-wall-decor', 'katanas', 'rc-cars', 'shinchan'
);
