# Implementation Plan: Bookkeeping
**Product:** Finora Business | **Scope:** V1 as defined in `prd-bookkeeping.md` | **Est. duration:** ~24 weeks (6 months)

## Team Assumption
1 backend lead (NestJS), 1 backend/ML engineer (Python FastAPI, STT/LLM pipeline), 1 frontend (React/React Native), 1 QA, 1 PM/design (you). Adjust phase durations if team size differs.

## Phase 0 — Foundations (Weeks 1–3)
- Decide & implement multi-tenancy enforcement (RLS + app-layer, per architecture doc)
- Core schema migration: `businesses`, `users`, `business_users`
- Auth (JWT), role scaffolding (Owner/Accountant/Staff), base API gateway
- AWS infra: S3 buckets, SQS queues, Redis instance provisioned
- WhatsApp Business API sandbox account + webhook signature verification working end-to-end (echo test)
**Exit criteria:** a signed-up business can log in, and a test WhatsApp message reaches our webhook with verified signature.

## Phase 1 — Voice-to-Ledger Core (Weeks 4–9)
- `inbound_messages`, `transactions`, `categories`, `transaction_audit_log` schema
- Ingestion service: dedup by WhatsApp message ID, audio → S3, queue job
- Async worker: STT integration (AWS Transcribe/Whisper) + LLM entity extraction with confidence scoring
- Confirmation-card flow (Confirm/Edit/Discard) + low-confidence clarifying-question flow
- High-value threshold enforcement (configurable per business)
- Duplicate-detection heuristic (same amount/party within 60s)
**Exit criteria:** a real voice note produces a correctly parsed, confirmed ledger entry within the 15s budget, ≥90% parse accuracy on a test set of 100 sample notes.

## Phase 2 — Receipts & Inventory (Weeks 10–13)
- Auto-receipt generation on confirmed income transactions (`receipts` table, PDF generation service)
- WhatsApp "send receipt" one-tap flow
- `products`, `catalog_shares` schema; product CRUD (app)
- Shareable catalog link generation + public read-only catalog view
**Exit criteria:** confirming a sale produces a receipt sendable in ≤2 taps; a product list is shareable via a public link reflecting live stock.

## Phase 3 — Invoicing (Weeks 14–18)
- `invoices`, `invoice_line_items`, `invoice_events`, `payment_webhook_events` schema
- Invoice creation (manual + from ledger draft), Paystack/Flutterwave payment link generation
- Webhook handlers for payment confirmation → auto-post ledger entry, idempotent on provider reference
- WhatsApp template message approval (Meta) for day-3/day-7 follow-up reminders
**Exit criteria:** an invoice sent via WhatsApp with a working payment link auto-reconciles to the ledger on payment, reminders fire on schedule within the 24h session window rules.

## Phase 4 — Visualization & Ledger Access (Weeks 19–20)
- Dashboard: trend chart, category breakdown, month-over-month (pre-aggregated, not live-computed)
- Ledger filter/export (CSV, PDF), async export for large ranges
**Exit criteria:** dashboard loads in <2s for a business with 12 months of data; export completes and notifies on completion for >90-day ranges.

## Phase 5 — Collaboration & Payroll (Weeks 21–23)
- `business_users` role enforcement across all endpoints (retrofit check across Phases 1–4 features)
- Team invite flow (WhatsApp-based), audit log surfacing in-app
- `staff`, `payroll_periods`, `payroll_entries` schema; payroll sheet generation/export, "mark paid" → ledger expense entry
**Exit criteria:** an Accountant-role user can log entries and view ledger/invoices but cannot access payroll or role management; a payroll run produces a downloadable payslip sheet and a ledger expense entry.

## Phase 6 — Hardening, Compliance, Launch Prep (Week 24)
- NDPR: 30-day audio auto-purge job + audit trail
- Load test WhatsApp webhook path for month-end volume spikes; SQS dead-letter queue + alerting
- Security review: RLS policy audit across all tenant tables, webhook signature verification audit
- Beta cohort (10–20 real businesses) on voice-to-ledger + receipts before full rollout
**Exit criteria:** beta cohort sign-off, all P0 bugs closed, retention job verified against real deleted records.

## Cross-Phase (ongoing)
- Confidence-threshold and auto-confirm limit tuning based on real parse accuracy data (start Phase 1, revisit through launch)
- WhatsApp message-template governance — every new bot-initiated message type outside the 24h window needs Meta approval lead time; flag new templates 2+ weeks ahead of the phase that needs them

## Key Risks / Dependencies to Track
- Meta template approval turnaround is external and can slip Phase 3 — submit templates at start of Phase 2
- STT accuracy on Nigerian English/Pidgin is the single biggest product risk — budget time in Phase 1 for a real sample-audio test set, not just synthetic test data
- RLS decision (Phase 0) blocks all schema work — must be resolved before Phase 1 migrations are written
