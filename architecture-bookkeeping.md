# Architecture: Bookkeeping — Boundaries, Entry Points & Dependencies
**Product:** Bookiee | **Owner:** OlaRedefine | **Status:** Draft v1 | **Date:** 2026-07-29
**Companion doc:** `docs/prd-bookkeeping.md`

## 1. Purpose
Document system boundaries, entry points, dependencies, and constraints before implementation begins. This is the reference for how requests enter the system, which layer owns which responsibility, and what external providers we're structurally coupled to.

## 2. System Shape (top-down)
```
WhatsApp webhook ─┐
Web/mobile API   ─┼─► Ingestion & sessions ─► Async processing ─► Core domain services ─► Data layer
Payment/bank hooks┘        (webhook handlers,    (STT + LLM parse,    (ledger, invoicing,     (Postgres,
                            Redis session,        SQS queue)          inventory, payroll,      Redis, S3)
                            dedup by msg id)                          RBAC)
```
Web/mobile requests can also call Core domain services directly (bypassing async processing) for non-voice actions (manual entry, invoice creation, dashboard reads).

## 3. Entry Points

| Entry point | Auth model | Trust level | Latency budget |
|---|---|---|---|
| WhatsApp webhook (Meta) | HMAC signature verification on payload | Untrusted external, verified sender | <15s end-to-end (voice → confirmation) |
| Web/mobile app API | JWT + role-based scope | Trusted authenticated user | Standard REST (<500ms) |
| Payment webhooks (Paystack/Flutterwave) | Signature/secret verification | Untrusted external, verified sender | Async, no user-facing SLA |
| Bank sync webhook (Mono) | Signature verification | Untrusted external, verified sender | Async, no user-facing SLA |
| Public receipt/invoice links | No auth (unguessable token URL) | Public, read-only | Standard page load |

Each entry point needs its own request-validation and rate-limiting policy — they must not share a single trust check.

## 4. Service Boundaries
- **Ingestion & sessions** — webhook handlers, WhatsApp session state (Redis), message-ID dedup. Owns nothing about business logic.
- **Async processing** — speech-to-text (AWS Transcribe/Whisper) + LLM entity extraction (amount/party/direction/category/confidence). Runs off an SQS queue, not inline with the webhook response.
- **Core domain services** — ledger, invoicing, inventory, payroll, RBAC. Single source of truth for business rules and permission checks, regardless of which entry point originated the request.
- **Data layer** — PostgreSQL (system of record), Redis (session/cache), S3 (voice audio, receipt/invoice PDFs).

## 5. External Dependencies — Documentation Required Per Provider

For **WhatsApp Cloud API, Mono, Paystack, Flutterwave, and the STT/LLM providers**, produce a one-pager each covering:
- **Rate limits & tiers** — WhatsApp messaging limits scale with number quality tier; caps concurrent business onboarding before a tier upgrade is needed
- **24-hour session window** (WhatsApp-specific) — free-form replies only within 24h of the user's last message; outside that window, template messages are required. Directly constrains invoice follow-up reminders (day-3/7) — likely template messages, not free text
- **Webhook retry behavior** — does the provider retry on non-2xx, for how long? Determines idempotency requirements on our side
- **Failure modes** — timeout vs. rejection vs. partial success per provider, and our fallback (e.g., does ledger entry creation still work manually if Mono sync fails?)
- **Sandbox vs. production differences** — Paystack/Flutterwave test-mode webhook behavior often differs from live

## 6. Cross-Cutting Constraints
- **Multi-tenancy isolation**: every table/query scoped by `business_id`. Decide now — Postgres RLS vs. app-layer enforcement — retrofitting RLS later is expensive.
- **Idempotency**: WhatsApp message ID is the dedup key for voice/text entries; payment webhooks dedup on provider transaction reference.
- **NDPR data residency & retention**: AWS region choice affects compliance; 30-day voice-audio auto-delete needs a scheduled job with an auditable deletion trail.
- **Confidence-threshold governance**: the high-value auto-confirm threshold (e.g. ₦100k) must live in config, not hardcoded — will be tuned post-launch.
- **Async backpressure**: define queue-depth alerting and a max-retry-then-dead-letter policy for SQS during provider outages or volume spikes (e.g. month-end logging surge).
- **RBAC enforcement point**: permission checks live in Core domain services only, so WhatsApp-originated and app-originated requests obey identical rules.

## 7. Required Documentation Before Implementation
1. API contracts for the 3 entry points (request/response shape, auth headers, error codes)
2. Sequence diagrams: voice-to-ledger happy path, and the low-confidence/clarification path
3. Dependency matrix: provider → rate limit → retry policy → fallback behavior
4. Multi-tenancy enforcement decision (RLS vs. app-layer) — affects every table's schema

## 8. Open Questions (carried from PRD, architecturally relevant)
1. Template-message library for WhatsApp follow-ups — who owns approval/versioning of these with Meta?
2. Does async processing need a dead-letter review UI for failed/low-confidence parses, or is that handled via support tickets in v1?
3. RLS vs. app-layer tenancy enforcement — decision owner and deadline?
