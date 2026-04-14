# ExtrudeIQ CRM Implementation - Complete Guide

## ✅ Completed Features

I've built a complete CRM system for your ExtrudeIQ platform with lead tracking, account management, opportunities, contacts, and a sales pipeline dashboard. Here's everything that's been implemented:

---

## 📊 Database Schema

### New Tables Created
1. **leads** - Track potential customers
   - Fields: company_name, industry, website, lead_source, status, score, primary_contact info
   - Status options: new, contacted, qualified, proposal, negotiating, converted, lost
   - Conversion tracking: converted_to_account_id, converted_at

2. **accounts** - Customer/Partner accounts
   - Fields: name, type (prospect/existing/partner), contact info, account_owner_id
   - Can be created manually or from converted leads
   - Tracks annual revenue, industry

3. **contacts** - People at accounts
   - Fields: first_name, last_name, email, phone, title
   - Tracks role: is_primary, is_decision_maker
   - Automatically deleted when account is deleted (CASCADE)

4. **opportunities** - Sales opportunities tied to accounts
   - Fields: name, description, status, estimated_value, probability_percent
   - Status options: prospecting, discovery, proposal, negotiation, won, lost
   - Timeline tracking: expected_close_date, next_step, last_activity_date

5. **Modified quotes table**
   - Added: account_id, opportunity_id (foreign keys)
   - Quotes can now be tied to specific accounts and opportunities

### Migration File
📍 Location: `/workspaces/ExtrudeIQ/supabase/migrations/crm_schema.sql`

**To apply the migration:**
```bash
cd /workspaces/ExtrudeIQ
# Run via Supabase CLI or execute SQL manually in Supabase dashboard
supabase db push
```

---

## 🔌 API Endpoints

### Leads Endpoints
```
GET    /api/admin/crm/leads                    - List leads (with pagination, search, status filter)
POST   /api/admin/crm/leads                    - Create new lead
GET    /api/admin/crm/leads/[id]               - Get specific lead
PATCH  /api/admin/crm/leads/[id]               - Update lead
DELETE /api/admin/crm/leads/[id]               - Delete lead
POST   /api/admin/crm/leads/[id]/convert       - Convert lead to account
```

### Accounts Endpoints
```
GET    /api/admin/crm/accounts                 - List accounts (with type & search filters)
POST   /api/admin/crm/accounts                 - Create new account
GET    /api/admin/crm/accounts/[id]            - Get account with contacts, opportunities, quotes
PATCH  /api/admin/crm/accounts/[id]            - Update account
DELETE /api/admin/crm/accounts/[id]            - Delete account
```

### Contacts Endpoints
```
GET    /api/admin/crm/accounts/[id]/contacts   - List contacts for account
POST   /api/admin/crm/accounts/[id]/contacts   - Create contact
PATCH  /api/admin/crm/accounts/[id]/contacts/[contactId] - Update contact
DELETE /api/admin/crm/accounts/[id]/contacts/[contactId] - Delete contact
```

### Opportunities Endpoints
```
GET    /api/admin/crm/accounts/[id]/opportunities         - List opportunities
POST   /api/admin/crm/accounts/[id]/opportunities         - Create opportunity
PATCH  /api/admin/crm/accounts/[id]/opportunities/[opportunityId] - Update opportunity
DELETE /api/admin/crm/accounts/[id]/opportunities/[opportunityId] - Delete opportunity
```

### Pipeline Reporting Endpoint
```
GET    /api/admin/crm/pipeline                - Get pipeline metrics with optional filters
Query params:
  - min_date: Filter by minimum close date
  - max_date: Filter by maximum close date
  - account_owner_id: Filter by account owner
```

---

## 🎨 UI Pages

### 1. Leads Management
📍 Location: `/app/admin/crm/leads/page.tsx`

**Features:**
- List all leads with pagination
- Search by company name or contact info
- Filter by status
- Create new lead inline form (modal)
- Delete leads
- Convert leads to accounts (with redirect to conversion page)
- Lead scoring visualization (0-100%)

**Access:** `/admin/crm/leads`

### 2. Lead Conversion Workflow
📍 Location: `/app/admin/crm/leads/[id]/convert/page.tsx`

**Features:**
- Display lead information
- Pre-populate account details from lead
- Allow customization of account name, type, website, industry
- Auto-link converted lead to account
- Update lead status to "converted"
- Redirect to account detail page after conversion

**Access:** `/admin/crm/leads/[id]/convert`

### 3. Accounts Management
📍 Location: `/app/admin/crm/accounts/page.tsx`

**Features:**
- Display accounts as grid cards
- Search by account name
- Filter by type (prospect/existing/partner)
- Create new account (modal form)
- Delete accounts
- Click cards to view account details
- Quick status and type display

**Access:** `/admin/crm/accounts`

### 4. Account Detail Page
📍 Location: `/app/admin/crm/accounts/[id]/page.tsx`

**Features:**
- Show account summary (type, status, industry, phone)
- **Contacts Section:**
  - List all contacts for account
  - Add new contact with modal form
  - Mark contacts as primary or decision-maker
  - Delete contacts
- **Opportunities Section:**
  - List all opportunities for account
  - Create new opportunity with status, estimated value, probability, close date
  - Delete opportunities
  - View opportunity summary stats

**Access:** `/admin/crm/accounts/[id]`

### 5. Sales Pipeline Dashboard
📍 Location: `/app/admin/crm/pipeline/page.tsx`

**Features:**
- **Summary Cards:** Total opportunities, total value, expected value, win rate
- **Pipeline Visualization:** Interactive bar chart showing deal flow by stage
  - Each stage: count, total value, expected value
  - Hover tooltips for details
  - Color-coded stages (prospecting, discovery, proposal, negotiation, won, lost)
- **Detailed Pipeline Table:** Shows all opportunities grouped by status
  - Account name, opportunity value, probability, expected value, close date
- **Filtering:**
  - Min/Max close date range
  - Account owner ID filter
- **Calculations:**
  - Expected value = estimated_value × (probability_percent / 100)
  - Win rate = won / (won + lost)
  - Average deal size

**Access:** `/admin/crm/pipeline`

---

## 📝 Updated Quote Creation

### Enhanced Quote Form
📍 Location: `/app/quotes/new/ui.tsx` and `/app/quotes/new/page.tsx`

**New Fields:**
- **Account Selection** (optional): Dropdown of active accounts
- **Opportunity Selection** (optional): Dropdown filtered by selected account
- When account is selected, opportunity dropdown appears with matching opportunities

**Updated Form Submission:**
- Now includes `account_id` and `opportunity_id` in payload
- Quotes are now traceable to specific CRM accounts and opportunities

**Access:** `/quotes/new`

---

## 🚀 Getting Started

### Step 1: Apply Database Migration
```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual - Copy SQL from migration file and run in Supabase dashboard
```

### Step 2: Start the Application
```bash
npm run dev
# Application will be available at http://localhost:3000
```

### Step 3: Access CRM Features
1. Log in to your account
2. Navigate to admin section
3. Access CRM features:
   - Leads: `/admin/crm/leads`
   - Accounts: `/admin/crm/accounts`
   - Pipeline: `/admin/crm/pipeline`
   - Or create quotes linked to accounts: `/quotes/new`

---

## 📋 Workflow Examples

### Example 1: Convert a Lead to Account
1. Go to `/admin/crm/leads`
2. View list of leads
3. Click "Convert" button on desired lead
4. Review lead information pre-populated
5. Customize account details if needed
6. Click "Convert to Account"
7. Redirected to account detail page
8. Create contacts and opportunities

### Example 2: Create and Track Opportunities
1. Go to `/admin/crm/accounts`
2. Click on an account to view details
3. Scroll to "Opportunities" section
4. Click "+ New Opportunity"
5. Fill in opportunity details (name, status, value, probability, close date)
6. Click "Save Opportunity"
7. Opportunity appears in both account detail and pipeline dashboard

### Example 3: View Sales Pipeline
1. Go to `/admin/crm/pipeline`
2. Use filters (date range, account owner) if desired
3. View summary metrics (total value, expected value, win rate)
4. See bar chart visualization of pipeline by stage
5. Scroll down to see detailed opportunities grouped by status
6. Hover on bars for details or click to view full opportunity list

### Example 4: Create Quote Linked to Opportunity
1. Go to `/quotes/new`
2. Select customer
3. Select material
4. Set finished length and area/weight
5. **NEW:** Select account from dropdown
6. **NEW:** Select opportunity (appears after account selection)
7. Complete quote normally
8. Quote is now linked to account and opportunity for tracking

---

## 📊 Database Relationships

```
Leads
  ├─ converted_to_account_id ──→ Accounts
  └─ (on convert, creates Account and updates lead status)

Accounts
  ├─ Contacts (1-to-many, CASCADE delete)
  ├─ Opportunities (1-to-many, CASCADE delete)
  ├─ Quotes (1-to-many)
  └─ account_owner_id ──→ Profiles (sales rep)

Opportunities
  └─ Quotes (1-to-many)

Quotes
  ├─ account_id ──→ Accounts
  ├─ opportunity_id ──→ Opportunities
  └─ customer_id ──→ Customers (existing)
```

---

## 🔐 Security Features

- **Row-Level Security (RLS):** All new tables have RLS policies
  - Users only see accounts/leads/opportunities they created
  - Contacts visible through account ownership
  - Opportunities visible through account ownership
- **Authentication:** All endpoints require valid session
- **Authorization:** Role-based checks maintained from existing system

---

## 🎯 Next Steps / Future Enhancements

1. **Lead Scoring:** Add AI/rule-based lead scoring system
2. **Activity Tracking:** Add activity log for interactions with leads/accounts
3. **Email Integration:** Connect to email for tracking customer communications
4. **Forecasting:** Add revenue forecasting based on pipeline
5. **Reports:** Additional reporting views (by industry, by account owner, etc.)
6. **Mobile:** Optimize UI for mobile access
7. **Automation:** Add field-level automation rules
8. **Integrations:** Connect to external CRM systems

---

## 📞 Support

All files are organized in:
- **API:** `/app/api/admin/crm/`
- **UI Pages:** `/app/admin/crm/`
- **Database:** `/supabase/migrations/crm_schema.sql`
- **Quote Integration:** `/app/quotes/new/`

Everything is built with Next.js 16, React 19, TypeScript, and Supabase, following your existing patterns and architecture.
