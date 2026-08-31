-- =============================================================================
-- Project QUANTEX — Supabase Migration 001: Initial Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor or via `supabase db push`

-- Enable UUID extension (needed for some features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PROFILES (extends Supabase Auth users)
-- =============================================================================
-- Supabase Auth stores users in auth.users. We create a profiles table
-- that references auth.users.id as the primary key.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'technician')),
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SERVICE CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔧',
  description TEXT NOT NULL DEFAULT ''
);

-- Seed the 7 required service categories
INSERT INTO service_categories (name, icon, description) VALUES
  ('PC/Laptop Repair', '💻', 'Hardware diagnostics, screen replacement, keyboard repair, motherboard repair, and component upgrades'),
  ('WiFi/Network', '📶', 'WiFi setup, network troubleshooting, router configuration, mesh network installation, and connectivity issues'),
  ('Device Setup', '📱', 'New device setup, data transfer, account configuration, app installation, and device optimization'),
  ('Software Support', '🖥️', 'OS installation, software troubleshooting, virus removal, driver updates, and system optimization'),
  ('Appliance Install', '🔌', 'Home appliance installation, setup, calibration, and basic maintenance'),
  ('Smart Home', '🏠', 'Smart device installation, hub setup, automation configuration, and smart home integration'),
  ('TV & Entertainment', '📺', 'TV mounting, home theater setup, cable management, streaming device configuration, and audio calibration')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TECHNICIANS
-- =============================================================================

CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_picture_url TEXT,
  skills TEXT[] DEFAULT '{}',
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  completed_jobs INTEGER DEFAULT 0,
  hourly_rate REAL DEFAULT 0,
  response_time TEXT DEFAULT '30 min',
  category_ids INTEGER[] DEFAULT '{}',
  profession TEXT[] DEFAULT '{}',
  services_offered JSONB DEFAULT '{}',
  years_experience INTEGER,
  certifications TEXT[] DEFAULT '{}',
  previous_company TEXT,
  areas_of_expertise TEXT[] DEFAULT '{}',
  languages_spoken TEXT[] DEFAULT '{}',
  visit_charge REAL,
  per_job_rate REAL,
  inspection_charge REAL,
  emergency_charge REAL,
  weekend_charge REAL,
  night_charge REAL,
  working_days TEXT[] DEFAULT '{}',
  working_hours_start TEXT,
  working_hours_end TEXT,
  emergency_available BOOLEAN DEFAULT false,
  vacation_mode BOOLEAN DEFAULT false,
  max_daily_bookings INTEGER,
  service_radius INTEGER,
  latitude REAL,
  longitude REAL,
  last_location_at TIMESTAMPTZ,
  service_city TEXT,
  pin_code TEXT,
  current_status TEXT DEFAULT 'offline' CHECK (current_status IN ('online', 'offline', 'busy', 'on_break', 'emergency_only')),
  status_before_job TEXT CHECK (status_before_job IN ('online', 'offline', 'busy', 'on_break', 'emergency_only')),
  verification_badges JSONB DEFAULT '[]',
  gender TEXT,
  date_of_birth TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS technicians_user_id_idx ON technicians(user_id);
CREATE INDEX IF NOT EXISTS technicians_is_available_idx ON technicians(is_available);

-- =============================================================================
-- BOOKINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES service_categories(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'searching', 'assigned', 'pending', 'accepted', 'travelling',
    'arriving', 'reached', 'in_progress', 'waiting_for_parts',
    'completed', 'payment_completed', 'cancelled'
  )),
  issue_description TEXT NOT NULL,
  address TEXT,
  scheduled_at TIMESTAMPTZ,
  estimated_cost REAL DEFAULT 0,
  final_cost REAL,
  notes TEXT,
  dest_latitude REAL,
  dest_longitude REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS bookings_technician_id_idx ON bookings(technician_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- =============================================================================
-- REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
-- Everyone can read profiles (for marketplace display)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Profile is auto-created on signup (handled by trigger)
-- No INSERT policy needed — the trigger uses SECURITY DEFINER

-- TECHNICIANS policies
-- Everyone can read technician profiles (for marketplace)
CREATE POLICY "Technicians are viewable by everyone"
  ON technicians FOR SELECT USING (true);

-- Users can create their own technician profile
CREATE POLICY "Users can create own technician profile"
  ON technicians FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update only their own technician profile
CREATE POLICY "Users can update own technician profile"
  ON technicians FOR UPDATE USING (auth.uid() = user_id);

-- BOOKINGS policies
-- Customers can read their own bookings
CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() = (
      SELECT user_id FROM technicians WHERE id = bookings.technician_id
    )
  );

-- Customers can create bookings (they are the customer)
CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Technicians can update bookings assigned to them
CREATE POLICY "Technicians can update assigned bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM technicians WHERE id = bookings.technician_id
    )
  );

-- Customers can cancel their own bookings
-- (Handled by UPDATE policy above — customer_id check in the UPDATE policy)

-- REVIEWS policies
-- Everyone can read reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT USING (true);

-- Customers can create reviews for their own bookings
CREATE POLICY "Customers can create reviews for own bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND auth.uid() = (
      SELECT customer_id FROM bookings WHERE id = booking_id
    )
  );

-- SERVICE CATEGORIES policies
-- Everyone can read categories
CREATE POLICY "Categories are viewable by everyone"
  ON service_categories FOR SELECT USING (true);

-- Only admins can modify categories (no admin role yet, so restrict all)
-- For now, no INSERT/UPDATE/DELETE policies = no one can modify via API

-- =============================================================================
-- REALTIME
-- =============================================================================
-- Enable realtime on bookings for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE technicians;
