-- =============================================================================
-- Project QUANTEX — Migration 002: Customer Cancellation + Seed Data
-- =============================================================================

-- =============================================================================
-- BLOCKER 1: CUSTOMER BOOKING CANCELLATION
-- =============================================================================
-- Problem: The existing UPDATE RLS policy only allows technicians to update bookings.
-- Customers cannot cancel their own bookings.
--
-- Solution: A SECURITY DEFINER trigger enforces business rules AFTER RLS allows the
-- customer's UPDATE. The RLS allows any authenticated user who owns the booking to
-- UPDATE it; the trigger then rejects any change that isn't a valid cancellation.

-- 1. Function: Validate booking status transitions
CREATE OR REPLACE FUNCTION public.validate_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_customer BOOLEAN;
  caller_is_technician BOOLEAN;
  allowed_cancel_statuses TEXT[] := ARRAY[
    'searching', 'assigned', 'pending', 'accepted'
  ];
BEGIN
  -- Determine caller role
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'customer'
  ) INTO caller_is_customer;

  SELECT EXISTS(
    SELECT 1 FROM public.technicians
    WHERE user_id = auth.uid()
  ) INTO caller_is_technician;

  -- Customer cancellation: only status='cancelled' from allowed states
  IF caller_is_customer AND NOT caller_is_technician THEN
    IF NEW.customer_id <> OLD.customer_id THEN
      RAISE EXCEPTION 'Cannot change booking customer';
    END IF;
    IF NEW.technician_id <> OLD.technician_id THEN
      RAISE EXCEPTION 'Cannot change booking technician';
    END IF;
    IF NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Customers can only cancel bookings, not change status to %', NEW.status;
    END IF;
    IF NOT (OLD.status = ANY(allowed_cancel_statuses)) THEN
      RAISE EXCEPTION 'Cannot cancel booking in status: %', OLD.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Technician updates: allowed (they handle accept/reject/complete/etc.)
  IF caller_is_technician THEN
    RETURN NEW;
  END IF;

  -- No other role should be able to update (RLS should prevent this, but defensive)
  RAISE EXCEPTION 'Not authorized to update this booking';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on bookings BEFORE UPDATE
DROP TRIGGER IF EXISTS enforce_booking_update_rules ON bookings;
CREATE TRIGGER enforce_booking_update_rules
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_update();

-- 3. Fix RLS: add a customer cancellation policy
-- The technician policy already allows technicians to UPDATE.
-- We add a customer policy that allows customers to UPDATE their own bookings.
-- The trigger above enforces what changes are actually allowed.
DROP POLICY IF EXISTS "Technicians can update assigned bookings" ON bookings;
CREATE POLICY "Technicians can update assigned bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM technicians WHERE id = bookings.technician_id
    )
  );

DROP POLICY IF EXISTS "Customers can cancel own bookings" ON bookings;
CREATE POLICY "Customers can cancel own bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = customer_id
  )
  WITH CHECK (
    auth.uid() = customer_id
  );

-- =============================================================================
-- BLOCKER 3: SEED TEST TECHNICIANS
-- =============================================================================
-- Creates 3 test technician accounts with Supabase Auth + profiles + technician records.
-- Passwords are set via Supabase Auth signUp which requires the auth service.
-- This script creates the DATABASE records. Auth accounts must be created via
-- the Supabase Auth API or Dashboard, or by using the app's registration flow.
--
-- INSTRUCTIONS:
-- Option A (Recommended): Use the QUANTEX app to register 3 technician accounts,
--   then run this script to update their profiles with proper data.
--
-- Option B: Create auth accounts via Supabase Dashboard (Authentication → Users),
--   then run this script with the actual UUIDs.

-- Test Technician 1: Laptop repair expert (Online)
-- Test Technician 2: WiFi/Network specialist (Online)
-- Test Technician 3: Smart Home installer (Emergency Only)

-- Placeholder UUIDs — REPLACE with actual auth user IDs after creating accounts
-- To find a user's UUID: SELECT id, email FROM auth.users;

-- Create a helper function to seed a technician given an auth user UUID
CREATE OR REPLACE FUNCTION public.seed_test_technician(
  p_user_id UUID,
  p_name TEXT,
  p_bio TEXT,
  p_hourly_rate REAL,
  p_category_ids INTEGER[],
  p_profession TEXT[],
  p_skills TEXT[],
  p_current_status TEXT,
  p_is_available BOOLEAN,
  p_service_city TEXT,
  p_latitude REAL,
  p_longitude REAL,
  p_languages TEXT[],
  p_years_experience INTEGER,
  p_response_time TEXT,
  p_visit_charge REAL
) RETURNS VOID AS $$
BEGIN
  -- Upsert profile
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (p_user_id, p_name, 'technician', p_name || '@quantex.test')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'technician';

  -- Upsert technician record
  INSERT INTO public.technicians (
    user_id, name, bio, hourly_rate, category_ids, profession, skills,
    current_status, is_available, service_city, latitude, longitude,
    languages_spoken, years_experience, response_time, visit_charge,
    completed_jobs, rating, review_count
  ) VALUES (
    p_user_id, p_name, p_bio, p_hourly_rate, p_category_ids, p_profession, p_skills,
    p_current_status, p_is_available, p_service_city, p_latitude, p_longitude,
    p_languages, p_years_experience, p_response_time, p_visit_charge,
    FLOOR(RANDOM() * 20 + 5)::INTEGER,  -- completed_jobs: 5-25
    ROUND((RANDOM() * 1.5 + 3.5)::NUMERIC, 1)::REAL,  -- rating: 3.5-5.0
    FLOOR(RANDOM() * 15 + 3)::INTEGER   -- review_count: 3-18
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    bio = EXCLUDED.bio,
    hourly_rate = EXCLUDED.hourly_rate,
    category_ids = EXCLUDED.category_ids,
    profession = EXCLUDED.profession,
    skills = EXCLUDED.skills,
    current_status = EXCLUDED.current_status,
    is_available = EXCLUDED.is_available,
    service_city = EXCLUDED.service_city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    languages_spoken = EXCLUDED.languages_spoken,
    years_experience = EXCLUDED.years_experience,
    response_time = EXCLUDED.response_time,
    visit_charge = EXCLUDED.visit_charge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEED INSTRUCTIONS
-- =============================================================================
-- After creating 3 Supabase Auth user accounts (via Dashboard or app registration),
-- run the following with actual user UUIDs:
--
-- SELECT public.seed_test_technician(
--   'REPLACE-WITH-ACTUAL-UUID-1',
--   'Rajesh Kumar',
--   'Expert laptop and PC repair technician with 10+ years of experience. Specialized in hardware diagnostics, screen replacement, and motherboard repair.',
--   50.00,
--   ARRAY[1, 4],         -- PC/Laptop Repair, Software Support
--   ARRAY['PC Repair', 'Laptop Specialist'],
--   ARRAY['Hardware Diagnostics', 'Screen Replacement', 'Motherboard Repair', 'Data Recovery'],
--   'online', true,
--   'Mumbai', 19.0760, 72.8777,
--   ARRAY['English', 'Hindi', 'Marathi'],
--   10, '20 min', 25.00
-- );
--
-- SELECT public.seed_test_technician(
--   'REPLACE-WITH-ACTUAL-UUID-2',
--   'Priya Sharma',
--   'Certified network engineer specializing in WiFi setup, router configuration, and mesh network installation for homes and offices.',
--   45.00,
--   ARRAY[2],            -- WiFi/Network
--   ARRAY['Network Engineer', 'WiFi Specialist'],
--   ARRAY['WiFi Setup', 'Router Config', 'Mesh Networks', 'Network Security', 'Fiber Installation'],
--   'online', true,
--   'Mumbai', 19.0596, 72.8295,
--   ARRAY['English', 'Hindi', 'Gujarati'],
--   7, '30 min', 20.00
-- );
--
-- SELECT public.seed_test_technician(
--   'REPLACE-WITH-ACTUAL-UUID-3',
--   'Amit Patel',
--   'Smart home installation and automation expert. Setup smart lights, cameras, thermostats, and complete home automation systems.',
--   60.00,
--   ARRAY[6, 7],         -- Smart Home, TV & Entertainment
--   ARRAY['Smart Home Installer', 'Home Theater Setup'],
--   ARRAY['Smart Lights', 'Security Cameras', 'Thermostats', 'Home Automation', 'TV Mounting'],
--   'emergency_only', true,
--   'Ahmedabad', 23.0225, 72.5714,
--   ARRAY['English', 'Hindi', 'Gujarati'],
--   5, '45 min', 30.00
-- );
