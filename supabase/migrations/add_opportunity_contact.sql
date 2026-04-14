-- Add contact_id to opportunities for linking a contact to each opportunity
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add account_owner_id to opportunities for assigning an owner
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS account_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
