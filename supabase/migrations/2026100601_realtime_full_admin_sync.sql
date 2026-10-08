-- ============================================================================
-- Supabase Migration: Full Admin & Realtime Sync for Products, Categories,
-- Orders, Product Requests, Homepage Banners, and Buyer Profiles
-- ============================================================================

-- 1. Enable REPLICA IDENTITY FULL on all core tables so real-time DELETE/UPDATE
-- events deliver complete old row data (including IDs) to subscribed clients.
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.product_images REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.product_requests REPLICA IDENTITY FULL;
ALTER TABLE public.homepage_banners REPLICA IDENTITY FULL;
ALTER TABLE public.buyer_profiles REPLICA IDENTITY FULL;

-- 2. Ensure all 7 tables belong to the supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_images;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_banners;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
