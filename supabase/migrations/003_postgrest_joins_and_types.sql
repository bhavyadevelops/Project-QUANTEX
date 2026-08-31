-- =============================================================================
-- Project QUANTEX — Migration 003: PostgREST Join Support
-- =============================================================================
-- Problem: PostgREST requires direct foreign key relationships between tables
-- to perform embedded resource queries (joins). Currently:
--   technicians.user_id → auth.users(id)     (no FK to profiles)
--   reviews.customer_id → auth.users(id)     (no FK to profiles)
--   profiles.id → auth.users(id)
--
-- When hooks use: technicians.select("*, profiles!inner(name)")
-- PostgREST cannot resolve the join because there's no direct FK between
-- technicians and profiles.
--
-- Solution: Add direct FK references from technicians.user_id → profiles.id
-- and reviews.customer_id → profiles.id. These are semantically correct
-- (every profile IS a supabase auth user) and allow PostgREST to resolve
-- the embedded queries.

-- Add FK: technicians.user_id → profiles.id
ALTER TABLE technicians
  DROP CONSTRAINT IF EXISTS technicians_user_id_profiles_fkey;

ALTER TABLE technicians
  ADD CONSTRAINT technicians_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add FK: reviews.customer_id → profiles.id
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_customer_id_profiles_fkey;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_customer_id_profiles_fkey
  FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- =============================================================================
-- NOTE: The existing FKs to auth.users(id) are still present.
-- This creates a two-hop chain: technicians.user_id → profiles.id → auth.users(id)
-- This is valid in PostgreSQL and actually MORE correct because:
--   1. PostgREST can now resolve the joins
--   2. The FK chain ensures referential integrity through profiles
--   3. The trigger still creates profiles on auth signup
-- =============================================================================
