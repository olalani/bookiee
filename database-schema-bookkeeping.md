# Database Schema: Bookkeeping
**Product:** Finora Business | Postgres 15+ | **Companion doc:** `architecture-bookkeeping.md`

**Assumption (flagged, needs sign-off):** Multi-tenancy enforced via Postgres Row-Level Security (RLS) on `business_id`, in addition to app-layer checks — belt and suspenders. Every tenant-scoped table below has `business_id` and an RLS policy scoped to the session's current business context. Confirm before implementation — this is the open question from the architecture doc.

## Core Tenancy & Identity

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT, -- 'sme', 'freelancer', 'corporate'
  currency TEXT NOT NULL DEFAULT 'NGN',
  auto_confirm_threshold NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','accountant','staff')),
  scope JSONB NOT NULL DEFAULT '{}', -- fine-grained overrides, e.g. {"payroll": false}
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (business_id, user_id)
);
CREATE INDEX idx_business_users_business ON business_users(business_id);
```

## WhatsApp Ingestion

```sql
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  pending_transaction JSONB, -- mirrors Redis cache; DB is durable fallback
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone_number)
);

CREATE TABLE inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT NOT NULL UNIQUE, -- idempotency key
  business_id UUID NOT NULL REFERENCES businesses(id),
  message_type TEXT NOT NULL, -- 'voice','text','button_reply'
  raw_audio_url TEXT,
  transcript_text TEXT,
  processing_status TEXT NOT NULL DEFAULT 'queued', -- queued/processing/parsed/failed
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbound_business ON inbound_messages(business_id, received_at);
```

## Ledger (core transaction table)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (business_id, name)
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('voice','text','manual','invoice','receipt','payroll')),
  inbound_message_id UUID REFERENCES inbound_messages(id),
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount NUMERIC(14,2) NOT NULL,
  counterparty_name TEXT,
  counterparty_phone TEXT,
  category_id UUID REFERENCES categories(id),
  confidence_score NUMERIC(4,3), -- null for manual entries
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','discarded')),
  requires_review BOOLEAN NOT NULL DEFAULT false, -- flagged duplicates, low confidence, over threshold
  created_by UUID REFERENCES users(id),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_business_date ON transactions(business_id, transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(business_id, status) WHERE status = 'pending';

CREATE TABLE transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  change_type TEXT NOT NULL, -- 'created','edited','discarded','confirmed'
  diff JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Receipts

```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  pdf_url TEXT NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  sent_to_phone TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Inventory

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_business ON products(business_id) WHERE active = true;

CREATE TABLE catalog_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE, -- public unguessable URL token
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
```

## Invoicing

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL, -- phone or email
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','partially_paid','paid','overdue')),
  total_amount NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  payment_link TEXT,
  payment_provider TEXT, -- 'paystack','flutterwave'
  follow_up_count INTEGER NOT NULL DEFAULT 0,
  transaction_id UUID REFERENCES transactions(id), -- set when paid, links to ledger
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_business_status ON invoices(business_id, status);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL
);

CREATE TABLE invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'sent','viewed','reminder_sent','paid','partially_paid'
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'paystack','flutterwave'
  provider_reference TEXT NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  raw_payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_reference) -- idempotency
);
```

## Payroll

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  salary_amount NUMERIC(14,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid')),
  UNIQUE (business_id, period_start, period_end)
);

CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),
  salary_amount NUMERIC(14,2) NOT NULL, -- snapshot at time of run
  payslip_url TEXT,
  transaction_id UUID REFERENCES transactions(id) -- set when marked paid
);
```

## Bank Sync (Mono) — v1 read-only, not auto-reconciled

```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  mono_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT,
  bank_name TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_transactions_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  mono_transaction_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(14,2) NOT NULL,
  narration TEXT,
  txn_date DATE NOT NULL,
  matched_transaction_id UUID REFERENCES transactions(id), -- null until manually matched
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## RLS Policy Pattern (applied to every tenant-scoped table)

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transactions
  USING (business_id = current_setting('app.current_business_id')::UUID);
-- Repeat for: categories, receipts, products, catalog_shares, invoices,
-- invoice_line_items, invoice_events, staff, payroll_periods, payroll_entries,
-- bank_accounts, bank_transactions_raw, business_users, whatsapp_sessions, inbound_messages
```
App layer sets `app.current_business_id` per request/transaction after auth resolves the caller's active business context.

## Data Retention Notes
- `inbound_messages.raw_audio_url` — scheduled job purges the S3 object + nulls this column 30 days after `processing_status = 'parsed'`, per NDPR (see architecture doc §6)
- `transaction_audit_log` retained indefinitely (compliance/audit trail, no PII beyond user reference)
