-- Add role column to profiles table
-- Run this AFTER crm_schema.sql if the database already exists

-- ============================================================================
-- STEP 1: Add role column with default 'viewer'
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

-- ============================================================================
-- STEP 2: Update trigger to set role on new user creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', profiles.full_name),
    role = COALESCE(new.raw_user_meta_data->>'role', profiles.role)
  RETURNING *;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Helper function to check admin role (SECURITY DEFINER avoids
--         infinite recursion when used inside an RLS policy on profiles)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 4: Add RLS policy so admins can read all profiles
-- ============================================================================

-- Drop the recursive policy if it was previously created
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());
