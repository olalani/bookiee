# PRD: Bookkeeping (Zero-Input Voice-to-Ledger + Core Finance Toolkit)
**Product:** Finora Business | **Owner:** OlaRedefine | **Status:** Draft v1 | **Date:** 2026-07-29

## 1. Problem Statement
SME owners, freelancers, and low-accounting-literacy business operators in Nigeria don't record transactions consistently because typing into an app is friction they skip mid-hustle. They already live in WhatsApp. Result: no real-time financials, no defensible records for tax/loans, no visibility into cash trends, and manual, error-prone invoicing/payroll. Bookkeeping must happen where the user already is (WhatsApp voice notes), with near-zero manual entry, and roll up into a real ledger, receipts, invoices, inventory, payroll, and reporting.

## 2. Success Metrics
- ≥70% of transactions logged via WhatsApp voice/text (not manual web/app entry) within 60 days of activation
- Voice note → correctly parsed ledger entry accuracy ≥90% (amount, direction, category)
- Median time from voice note sent → entry confirmed in ledger < 15 seconds
- ≥40% of active users send ≥1 invoice or receipt via the platform monthly
- Weekly active bookkeeping users (≥3 logged transactions/week) ≥50% of onboarded businesses by month 3
- Support ticket rate for "wrong entry" < 5% of total logged transactions

## 3. Users
- SME/corporate owners and staff (low accounting knowledge) — primary loggers via WhatsApp
- Freelancers — solo use, invoicing + receipts heavy
- Team members with roles (Owner, Accountant, Staff, Payroll Admin) — Collaboration feature

## 4. Suggested Stack (consistent with existing Finora stack)
- Backend: NestJS (core API), Python FastAPI microservice (voice transcription + NLP transaction parsing)
- Voice/NLP: WhatsApp Business Cloud API (media webhook) → AWS Transcribe or Whisper for speech-to-text → LLM (Claude via API) for entity extraction (amount, party, category, direction) with a confidence score
- DB: PostgreSQL (ledger, invoices, payroll), Redis (WhatsApp session state, pending-confirmation cache)
- Mobile/Web: React Native, React.js
- Payments/bank data: Mono (statement/txn sync), Paystack/Flutterwave (invoice payment links, payroll disbursement)
- Infra: AWS (S3 for receipt/voice storage, SQS for async parsing jobs)
- Compliance: NDPR — encrypt voice notes at rest, auto-delete raw audio after 30 days once transcribed

## 5. User Stories & Acceptance Criteria

**US1 — Voice-to-Ledger (core)**
As an SME owner, I send a WhatsApp voice note ("Received 50k from Chioma for rice supply") and it becomes a ledger entry.
- AC: System transcribes, extracts amount/party/direction/category, replies within 15s with a structured confirmation card (Confirm / Edit / Discard buttons)
- AC: On "Confirm," entry posts to ledger with source=voice, audio link retained until auto-delete
- AC: If confidence score < 80%, system asks one clarifying question before posting (e.g., "Is this income or expense?")
- AC: Works in Nigerian English + Pidgin phrasing patterns

**US2 — Instant Receipt Delivery**
As a business, after confirming a sale via voice/text, I get a branded receipt PDF sent to me and forwardable to my customer instantly.
- AC: Receipt auto-generates on transaction confirmation, includes business logo, amount, date, ref number
- AC: One-tap "Send to customer" shares via WhatsApp

**US3 — Inventory sharing**
As a business, I can maintain a product list and share it as a catalog link/PDF with customers.
- AC: Add/edit product (name, price, stock qty, image) via app or WhatsApp command
- AC: "Share list" generates a shareable catalog link or PDF card

**US4 — Instant Invoicing**
As a freelancer, I generate and send an invoice to a client in under 1 minute, with automated follow-up.
- AC: Create invoice from ledger draft or manual entry; send via WhatsApp/email with payment link (Paystack/Flutterwave)
- AC: Auto follow-up reminder at day 3/7 if unpaid; status updates (sent/viewed/paid) sync to ledger

**US5 — Financial Visualization**
As an owner, I see income/expense trends over a selected period.
- AC: Dashboard shows cash in/out, top categories, month-over-month trend chart
- AC: Filterable by date range, category, team member

**US6 — Collaboration/Roles**
As an owner, I invite staff with scoped roles (view-only, entry-only, admin).
- AC: Role-based access enforced on all ledger/invoice/payroll actions
- AC: Audit log of who created/edited each entry

**US7 — Ledger Access**
As a user, I view and export all transactions for a period.
- AC: Filter by date/category/source(voice, manual, invoice, receipt); export CSV/PDF

**US8 — Payroll**
As an owner, I manage staff payroll and generate a payslip sheet.
- AC: Add staff + salary; generate monthly payroll sheet; export/download; (v1: manual disbursement, no auto-pay)

## 6. Scope — V1
- WhatsApp voice + text-to-ledger for income/expense entries (single currency: NGN)
- Confirmation-card flow with edit/discard
- Receipts (auto-gen + WhatsApp share)
- Basic inventory list + shareable catalog
- Invoicing with Paystack/Flutterwave payment links + 2-stage auto-follow-up
- Dashboard: trend chart + category breakdown (no forecasting)
- Roles: Owner, Accountant, Staff (fixed permission sets, no custom role builder)
- Ledger view/export (CSV, PDF)
- Payroll: manual entry, payslip generation/export (no auto-disbursement, no tax computation)

## 7. Out of Scope (V1)
- Multi-currency / multi-language beyond English & Pidgin
- Auto payroll disbursement and statutory deductions (PAYE, pension) computation
- Custom/granular role permission builder
- Voice input on non-WhatsApp channels (Telegram, SMS)
- Predictive/forecasting analytics
- Automated bank reconciliation matching (Mono sync shown but not auto-matched to ledger in v1)
- Offline mode

## 8. Data Model Changes
- `transactions`: id, business_id, source_type(enum: voice/text/manual/invoice/receipt), raw_audio_url, transcript_text, confidence_score, amount, direction(in/out), category_id, counterparty, status(pending/confirmed/discarded), created_by, created_at
- `whatsapp_sessions`: id, business_id, phone_number, pending_transaction_json (Redis-backed, TTL), last_interaction_at
- `receipts`: id, transaction_id, pdf_url, sent_to, sent_at
- `products`: id, business_id, name, price, stock_qty, image_url, active
- `invoices`: id, business_id, client_contact, line_items(jsonb), status(draft/sent/viewed/paid/overdue), payment_link, follow_up_count
- `roles`: id, business_id, user_id, role_type(owner/accountant/staff), scope(jsonb)
- `payroll_entries`: id, business_id, staff_id, salary_amount, period, payslip_url

## 9. Edge Cases & Failure States
- Garbled/noisy voice note → confidence <50%: bot replies "Couldn't understand, please resend or type the amount"
- Ambiguous amount (e.g., "50k" vs "50 thousand naira" vs typo "5000000") → always show parsed value in confirmation card before posting, never auto-post above a configurable threshold (default ₦100,000) without explicit confirm
- User sends voice note while offline/WhatsApp delayed delivery → dedupe by WhatsApp message ID to prevent double-posting on retry
- Duplicate transaction (same amount/party within 60s) → flag as possible duplicate, ask to confirm
- Staff without permission tries to send voice entry → bot replies with permission-denied, does not create entry
- Invoice payment link expires/fails → invoice stays "sent," manual mark-as-paid available
- WhatsApp API downtime → queue incoming messages in SQS, process on recovery, no data loss
- NDPR: raw audio auto-purged after 30 days regardless of processing status

## 10. Open Questions
1. Should voice-to-ledger support group/shared business WhatsApp numbers, or one number per business only?
2. What's the confirmation UX when user has no smartphone (only basic WhatsApp)? Buttons vs numbered text replies?
3. Should payroll compute PAYE/pension in v1 or stay purely manual entry + payslip formatting?
4. Threshold for "high-value transaction requires confirm" (₦100k default) — configurable per business or fixed?
5. Is Mono bank sync a v1 requirement or does ledger stay purely voice/manual/invoice-driven at launch?
6. Pricing/plan gating: is voice-to-ledger available on free tier or paid-only?
