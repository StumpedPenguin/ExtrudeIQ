-- CRM Schema Migration for ExtrudeIQ
-- This migration adds the complete CRM system (leads, accounts, opportunities, contacts)
-- Run this after the base schema is set up

-- ============================================================================
-- PROFILES TABLE - Mirror of auth.users with app-specific data
-- ============================================================================

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop and recreate profiles table to ensure clean schema
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile') THEN
    CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- Helper function to check admin role (SECURITY DEFINER avoids infinite
-- recursion when used inside an RLS policy on the profiles table itself)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- Trigger to create profile on auth signup
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

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Populate existing auth users into profiles (idempotent)
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ENUMS - Create custom types for status tracking
-- ============================================================================

-- Drop tables first (in reverse order of dependencies)
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Now drop the types
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS opportunity_status CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

CREATE TYPE lead_status AS ENUM (
  'new',           -- Just created
  'contacted',     -- Initial outreach completed
  'qualified',     -- Fits ideal customer profile
  'proposal',      -- Quote/proposal sent
  'negotiating',   -- In active discussion
  'converted',     -- Successfully converted to account
  'lost'           -- Lost opportunity
);

CREATE TYPE opportunity_status AS ENUM (
  'prospecting',   -- Initial discovery
  'discovery',     -- Needs analysis underway
  'proposal',      -- Proposal presented
  'negotiation',   -- Terms being discussed
  'won',           -- Closed won
  'lost'           -- Closed lost
);

CREATE TYPE account_type AS ENUM (
  'prospect',      -- Converted lead
  'existing',      -- Existing customer
  'partner'        -- Strategic partner
);

-- ============================================================================
-- ACCOUNTS TABLE - Customer/Partner Accounts
-- ============================================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account Identity
  name TEXT NOT NULL,
  type account_type DEFAULT 'prospect',
  
  -- Contact Information
  website TEXT,
  phone TEXT,
  industry TEXT,
  annual_revenue TEXT, -- examples: 'under_1m', '1m_5m', '5m_10m', '10m_50m', '50m_100m', 'over_100m'
  
  -- Relationship to Lead (if converted from lead)
  source_lead_id UUID, -- Will add foreign key after leads table is created
  
  -- Account Management
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'churned')),
  account_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Sales rep responsible
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT account_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ============================================================================
-- LEADS TABLE - Track potential customers and lead progression
-- ============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  description TEXT,
  
  -- Lead Source & Status Tracking
  lead_source TEXT, -- 'website', 'referral', 'inbound', 'outbound', 'event', etc.
  status lead_status DEFAULT 'new',
  
  -- Lead Scoring (0-100, higher = hotter)
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  
  -- Initial Contact Information (before creating full contacts)
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  -- Conversion Tracking
  converted_at TIMESTAMP,
  converted_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT company_name_not_empty CHECK (length(trim(company_name)) > 0)
);

-- Add the source_lead_id foreign key constraint to accounts now that leads exists
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_source_lead 
  FOREIGN KEY (source_lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- ============================================================================
-- CONTACTS TABLE - People at Accounts (tied to accounts)
-- ============================================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Association with Account
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT, -- Job title: 'CEO', 'Procurement Manager', 'Operations Director', etc.
  
  -- Role in Decision Process
  is_primary BOOLEAN DEFAULT FALSE,           -- Primary contact for account
  is_decision_maker BOOLEAN DEFAULT FALSE,    -- Has authority to purchase
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT first_name_not_empty CHECK (length(trim(first_name)) > 0),
  CONSTRAINT last_name_not_empty CHECK (length(trim(last_name)) > 0)
);

-- ============================================================================
-- OPPORTUNITIES TABLE - Sales opportunities tied to accounts
-- ============================================================================

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Association with Account
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Opportunity Details
  name TEXT NOT NULL,
  description TEXT,
  status opportunity_status DEFAULT 'prospecting',
  
  -- Deal Economics
  estimated_value DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  probability_percent INTEGER DEFAULT 50 CHECK (probability_percent >= 0 AND probability_percent <= 100),
  
  -- Timeline & Activity
  expected_close_date DATE,
  next_step TEXT,
  last_activity_date TIMESTAMP,
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT opportunity_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ============================================================================
-- UPDATE QUOTES TABLE - Link quotes to accounts and opportunities
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'account_id') THEN
    ALTER TABLE quotes ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'opportunity_id') THEN
    ALTER TABLE quotes ADD COLUMN opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add comment for clarity
COMMENT ON COLUMN quotes.account_id IS 'The account this quote is for';
COMMENT ON COLUMN quotes.opportunity_id IS 'The opportunity this quote is associated with (optional)';

-- ============================================================================
-- INDEXES - Optimize query performance
-- ============================================================================

-- Leads Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_account ON leads(converted_to_account_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);

-- Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(account_owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_source_lead ON accounts(source_lead_id);

-- Contacts Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_contacts_is_decision_maker ON contacts(is_decision_maker);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Opportunities Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_account ON opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(expected_close_date);

-- Quotes Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_account ON quotes(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity ON quotes(opportunity_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables (idempotent - doesn't fail if already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies for leads (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view leads they created') THEN
    CREATE POLICY "Users can view leads they created" ON leads FOR SELECT USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create leads') THEN
    CREATE POLICY "Users can create leads" ON leads FOR INSERT WITH CHECK (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update leads they created') THEN
    CREATE POLICY "Users can update leads they created" ON leads FOR UPDATE USING (created_by = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view accounts they created') THEN
    CREATE POLICY "Users can view accounts they created" ON accounts FOR SELECT USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create accounts') THEN
    CREATE POLICY "Users can create accounts" ON accounts FOR INSERT WITH CHECK (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update accounts they created') THEN
    CREATE POLICY "Users can update accounts they created" ON accounts FOR UPDATE USING (created_by = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view contacts on their accounts') THEN
    CREATE POLICY "Users can view contacts on their accounts" ON contacts FOR SELECT USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create contacts on their accounts') THEN
    CREATE POLICY "Users can create contacts on their accounts" ON contacts FOR INSERT WITH CHECK (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update contacts on their accounts') THEN
    CREATE POLICY "Users can update contacts on their accounts" ON contacts FOR UPDATE USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view opportunities on their accounts') THEN
    CREATE POLICY "Users can view opportunities on their accounts" ON opportunities FOR SELECT USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create opportunities on their accounts') THEN
    CREATE POLICY "Users can create opportunities on their accounts" ON opportunities FOR INSERT WITH CHECK (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update opportunities on their accounts') THEN
    CREATE POLICY "Users can update opportunities on their accounts" ON opportunities FOR UPDATE USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
END
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
