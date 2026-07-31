# User Journeys: Bookkeeping
**Product:** Finora Business | **Companion docs:** `prd-bookkeeping.md`, `architecture-bookkeeping.md`

## Personas
- **Adaeze** — SME owner, sells rice/foodstuff wholesale, 2 staff, low accounting literacy, lives on WhatsApp
- **Tunde** — freelance graphic designer, solo, invoices clients directly, wants speed over structure
- **Ngozi** — Adaeze's accountant, added as a team member, needs read + entry access but not payroll

---

## J1 — Onboarding & WhatsApp Linking
**Trigger:** Adaeze downloads app / signs up via web after referral.
1. Signup (phone number + business name + business type) → OTP verification
2. App prompts "Connect WhatsApp" → sends a one-time link code Adaeze must message to Finora's WhatsApp Business number
3. On receipt, backend links `phone_number` → `business_id`, replies with a welcome message + a 3-line usage example ("Try sending: 'Sold 2 bags of rice to Chioma for 40k'")
4. Adaeze sets default currency (NGN, fixed v1) and adds first product/category optionally (skippable)
5. **Success state:** business marked `onboarded=true`; first voice/text note is auto-detected and processed with extra guidance in the confirmation reply

**Failure/edge states:**
- Phone number already linked to another business → reply asks to unlink first via app, not silently switch
- OTP expired → resend flow, max 3 attempts before 15-min lockout

---

## J2 — Voice-to-Ledger (core flow)
**Trigger:** Adaeze sends a WhatsApp voice note: *"Received fifty thousand from Chioma for rice supply."*
1. Webhook receives audio → dedup by WhatsApp message ID → stored to S3, queued for async processing
2. Bot immediately reacts with a "processing" emoji/ack (no blocking wait)
3. Async worker transcribes → LLM extracts: amount=₦50,000, direction=in, party="Chioma", category=suggested "Sales"
4. If confidence ≥80%: bot replies within 15s with a confirmation card — amount, direction, party, category, buttons **Confirm / Edit / Discard**
5. Adaeze taps **Confirm** → transaction posted to ledger (`source=voice`), receipt auto-generated (see J3)
6. **Success state:** entry visible in app ledger within seconds, audio retained (encrypted) until 30-day auto-purge

**Low-confidence path:**
- Confidence <80% → bot asks one targeted clarifying question ("Is this money coming in or going out?") before posting — never posts silently
- No reply within 24h → entry stays `pending`, surfaced in app under "Needs review"

**Failure/edge states:**
- Garbled audio → "Couldn't understand that — try again or type the amount"
- Amount >₦100,000 (configurable threshold) → confirmation card always required, no fast-path auto-post
- Possible duplicate (same amount/party within 60s) → flagged in the confirmation card as "Looks similar to an entry from a minute ago — still log this?"
- Staff without entry permission sends a voice note → bot replies with permission-denied, no entry created

---

## J3 — Instant Receipt Delivery
**Trigger:** Any transaction is confirmed (voice, text, or manual) where direction=in and a counterparty exists.
1. System generates a branded PDF receipt (business logo, amount, date, reference number) automatically
2. Bot sends Adaeze a WhatsApp message: "Receipt ready — send to Chioma?" with a **Send** button
3. Tapping **Send** prompts Adaeze to forward via WhatsApp share sheet, or system sends directly if Chioma's number was captured
4. **Success state:** receipt logged against the transaction, downloadable later from Ledger (J6)

**Edge states:**
- No counterparty phone number captured → receipt generated but "Send" defaults to share-link/download only

---

## J4 — Inventory: Share Product List
**Trigger:** Adaeze wants to send her rice/foodstuff price list to a new customer.
1. In-app or via WhatsApp command ("show my products"), Adaeze adds/edits products: name, price, stock qty, photo
2. Taps **Share list** → system generates a shareable catalog link (or PDF card)
3. Adaeze forwards the link/PDF via WhatsApp to the customer
4. **Success state:** catalog view is public read-only; out-of-stock items shown but marked unavailable

**Edge states:**
- Stock qty hits 0 while a catalog link is already shared → catalog reflects live stock, not a stale snapshot

---

## J5 — Invoicing (Tunde's flow)
**Trigger:** Tunde finishes a logo design project and needs to bill the client.
1. Creates invoice (manually, or converts a ledger draft) with line items, due date
2. Sends via WhatsApp/email; system attaches a Paystack/Flutterwave payment link
3. Client views invoice → status updates to "viewed"; pays → status updates to "paid", auto-posts as a ledger income entry
4. If unpaid by day 3 → automated WhatsApp template reminder sent (within 24h session window rules); day 7 → second reminder
5. **Success state:** invoice fully reconciled against ledger with no manual re-entry

**Edge states:**
- Payment link fails/expires → invoice stays "sent"; Tunde can manually mark as paid (flagged for review)
- Client pays partial amount → invoice marked "partially paid," remainder tracked

---

## J6 — Ledger Access & Export
**Trigger:** Adaeze wants last month's transactions for a loan application.
1. Opens Ledger tab, filters by date range and/or source (voice/manual/invoice/receipt)
2. Taps **Export** → CSV or PDF generated
3. **Success state:** download delivered in-app; large exports (>90 days) processed async with a "ready" notification

---

## J7 — Financial Visualization
**Trigger:** Adaeze wants to know if this month is better than last.
1. Opens Dashboard → sees income/expense trend chart, top categories, month-over-month comparison
2. Filters by date range, category, or team member (if collaboration enabled)
3. **Success state:** insights load from pre-aggregated data (not live-computed on every view) for speed

---

## J8 — Collaboration & Roles
**Trigger:** Adaeze wants Ngozi to handle bookkeeping without touching payroll.
1. Adaeze (Owner) invites Ngozi by phone number, assigns role = Accountant
2. Ngozi receives WhatsApp invite link, accepts, links her own number to the business
3. Ngozi can now log entries and view ledger/invoices; payroll and role management stay hidden/blocked
4. Every entry Ngozi creates is attributed and visible in an audit trail
5. **Success state:** Adaeze can revoke Ngozi's access instantly; revocation takes effect on next request, not next login

**Edge states:**
- Ngozi's number is already linked to her own separate business → she operates both, switching context explicitly in-app (no auto-merge)

---

## J9 — Payroll
**Trigger:** Month-end, Adaeze needs to pay her 2 staff.
1. Adds staff (name, salary, pay period) once during setup
2. At month-end, opens Payroll tab, reviews auto-populated payroll sheet
3. Downloads payslip sheet (PDF/CSV) for manual bank transfer (v1: no auto-disbursement)
4. Marks payroll as "paid" for the period, which posts as a ledger expense
5. **Success state:** payslip history retained per staff member, exportable per period

**Edge states:**
- Mid-month salary change → applies from the next full pay period, not retroactively, unless manually adjusted
