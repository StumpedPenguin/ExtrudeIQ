-- CRM Revamp Migration: Replace customers with accounts, add activities table
-- Run this AFTER crm_schema.sql

-- ============================================================================
-- STEP 1: Migrate customers into accounts (if customers table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Insert customers that don't already have a matching account by name
    INSERT INTO accounts (name, type, status, created_by, created_at)
    SELECT
      c.name,
      'existing'::account_type,
      CASE WHEN c.status = 'active' THEN 'active' ELSE 'inactive' END,
      -- Use the first admin user as created_by, or fallback to the first profile
      COALESCE(
        (SELECT id FROM profiles WHERE email IS NOT NULL LIMIT 1),
        (SELECT id FROM profiles LIMIT 1)
      ),
      c.created_at
    FROM customers c
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a WHERE lower(trim(a.name)) = lower(trim(c.name))
    );
  END IF;
END
$$;

-- ============================================================================
-- STEP 2: Backfill account_id on quotes from customer_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'customer_id') THEN
    -- Update quotes that have a customer_id but no account_id
    UPDATE quotes q
    SET account_id = a.id
    FROM customers c
    JOIN accounts a ON lower(trim(a.name)) = lower(trim(c.name))
    WHERE q.customer_id = c.id
      AND q.account_id IS NULL;

    -- Now that account_id is used instead, make customer_id nullable
    ALTER TABLE quotes ALTER COLUMN customer_id DROP NOT NULL;
  END IF;
END
$$;

-- ============================================================================
-- STEP 3: Create activities table for activity logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Associations (at least account_id should be present)
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'quote_created', 'quote_status_changed', 'quote_revision_created',
    'contact_added', 'contact_removed',
    'opportunity_created', 'opportunity_status_changed',
    'lead_converted',
    'account_created', 'account_updated',
    'note'
  )),
  title TEXT NOT NULL,
  description TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_account ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_quote ON activities(quote_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);

-- Enable RLS on activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities: users see activities for accounts they created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view activities on their accounts') THEN
    CREATE POLICY "Users can view activities on their accounts" ON activities
      FOR SELECT USING (
        account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create activities on their accounts') THEN
    CREATE POLICY "Users can create activities on their accounts" ON activities
      FOR INSERT WITH CHECK (
        account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid())
      );
  END IF;
END
$$;

-- ============================================================================
-- STEP 4: Add delete policies for leads and accounts (if missing)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete leads they created') THEN
    CREATE POLICY "Users can delete leads they created" ON leads
      FOR DELETE USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete accounts they created') THEN
    CREATE POLICY "Users can delete accounts they created" ON accounts
      FOR DELETE USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete contacts on their accounts') THEN
    CREATE POLICY "Users can delete contacts on their accounts" ON contacts
      FOR DELETE USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete opportunities on their accounts') THEN
    CREATE POLICY "Users can delete opportunities on their accounts" ON opportunities
      FOR DELETE USING (account_id IN (SELECT id FROM accounts WHERE created_by = auth.uid()));
  END IF;
END
$$;
