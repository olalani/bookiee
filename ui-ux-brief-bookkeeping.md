# UI/UX Brief: Bookkeeping
**Product:** Finora Business | **Companion docs:** `prd-bookkeeping.md`, `user-journeys-bookkeeping.md`

## 1. Design Principles
1. **WhatsApp is a first-class UI, not a fallback.** Confirmation cards, buttons, and reminders must be designed with the same care as app screens — most users will interact here more than in the app.
2. **Zero-input by default, structure on demand.** The app should never require Adaeze to categorize/tag before she can move on — smart defaults + easy correction beats mandatory upfront structure.
3. **Trust through visibility, not friction.** Every auto-posted entry must be easy to find, edit, or dispute after the fact — trust is built by making mistakes cheap to fix, not by asking more questions upfront.
4. **Low-literacy first.** Icons + short labels over paragraphs; Naira amounts always formatted with thousands separators; avoid accounting jargon (say "money in/out" not "debit/credit" anywhere user-facing).
5. **Role-aware UI.** Staff/Accountant views hide screens they can't act on rather than showing disabled/greyed-out states — reduces confusion about what's "broken" vs. "not permitted."

## 2. Information Architecture (App)
```
Home (Dashboard)
├── Ledger
│   ├── Transaction detail (edit, view audio/receipt)
│   └── Export
├── Invoices
│   ├── Create/Edit invoice
│   └── Invoice detail (status, payment link, reminders)
├── Receipts (history)
├── Inventory
│   ├── Product list
│   └── Shareable catalog
├── Payroll
│   ├── Staff list
│   └── Payroll sheet (per period)
├── Team (Collaboration)
│   ├── Members + roles
│   └── Audit log
└── Settings
    ├── Business profile
    ├── WhatsApp linking
    └── Thresholds (auto-confirm limit)
```

## 3. Key Screens

**Home/Dashboard**
- Top: this-month income vs. expense summary card (large numbers, color-coded: green=in, coral=out)
- Trend chart (line or bar, toggle weekly/monthly)
- Category breakdown (top 5, "see all" for rest)
- Quick actions: "New invoice," "Add product," "View ledger"

**Transaction confirmation card (WhatsApp)**
- Structured, not prose: Amount / Direction / Party / Category on separate lines
- Three buttons: Confirm, Edit, Discard — Edit opens a short guided text reply, not a full form
- Low-confidence variant: single yes/no or short-answer clarifying question, re-shows the parsed guess so the user isn't typing blind

**Ledger (app)**
- Table/list view: date, description, amount (color-coded in/out), source icon (voice/manual/invoice/receipt), status
- Filter bar: date range, category, source, team member
- Tap row → detail view with linked audio playback (if source=voice), receipt PDF, edit history

**Invoice detail**
- Status pill prominent at top (draft/sent/viewed/paid/overdue/partially paid)
- Payment link + "copy link" and "resend" actions
- Timeline of events (sent, viewed, reminder sent, paid)

**Inventory / catalog share**
- Grid of product cards (photo, name, price, stock badge)
- "Share list" generates a preview of the public catalog before sending — no surprises about what the customer will see

**Team & roles**
- Member list with role badges (Owner/Accountant/Staff)
- Role picker uses plain-language permission summaries, not a matrix ("Can log transactions, can't see payroll") instead of checkboxes

**Payroll sheet**
- Spreadsheet-style table: staff name, salary, period, status (pending/paid)
- Single "Mark all paid" action posts a batch ledger expense entry

## 4. WhatsApp Conversational UX Rules
- Every bot message that expects a reply uses interactive buttons/quick-replies where WhatsApp supports it — never rely on the user typing an exact keyword
- Confirmation cards always restate the parsed data — never ask the user to confirm something they can't see
- Clarifying questions are single-purpose (one ask per message), never a multi-part form crammed into text
- Reminders and any message sent outside the 24h session window use pre-approved templates — brief, name the invoice, one clear CTA link
- Error/failure messages are plain language + one suggested next action (never a raw error code)

## 5. Visual Language
- Palette: teal/green for income and positive states, coral/red for expense and warnings, gray/neutral for structural UI, amber for pending/needs-review states
- Currency always shown with ₦ symbol and thousands separators (₦50,000, never 50000)
- Icons over text labels for navigation (ledger, invoice, inventory, payroll, team) with short text labels beneath — never icon-only
- Empty states always include a one-line action ("No transactions yet — send a WhatsApp voice note to get started")

## 6. Accessibility & Localization
- Support English + Nigerian Pidgin phrasing recognition in voice/text parsing (v1); UI copy stays in English
- Minimum tap target 44x44px on mobile; text scalable without breaking layout
- Color is never the only signal — pair in/out color coding with a directional icon (arrow up/down) for color-blind users

## 7. Non-Goals (v1 UI)
- No custom dashboard widgets/layout editing
- No dark-mode-specific design pass beyond system defaults
- No multi-language UI copy (voice parsing language support ≠ UI translation)
