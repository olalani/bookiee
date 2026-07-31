# Bookiee

Voice-first bookkeeping for Nigerian SMEs. Send a WhatsApp voice note, get a ledger entry.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend API    │     │  Python NLP     │
│   React + Vite  │────▶│   NestJS         │────▶│  FastAPI        │
│   Port 3000     │     │   Port 3001      │     │  Port 8001      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                         │
                              ▼                         ▼
                        ┌──────────┐            ┌──────────────┐
                        │ PostgreSQL│            │ OpenAI Whisper│
                        │ Redis     │            │ GPT-4o-mini   │
                        └──────────┘            └──────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 15+
- Redis

### 1. Install Dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../python-service && pip install -r requirements.txt
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your database URL, API keys, etc.
cp backend/.env.example backend/.env
cp python-service/.env.example python-service/.env
cp frontend/.env.example frontend/.env
```

### 3. Set Up Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Python NLP Service
cd python-service && uvicorn app.main:app --reload --port 8001

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### 5. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- NLP Service: http://localhost:8001

### Login (seeded data)
- Phone: +2348012345678
- Password: password123

## Features

- **Voice-to-Ledger** — Send WhatsApp voice notes, auto-parsed into ledger entries
- **Interactive Confirmation** — Confirm/Edit/Discard buttons on WhatsApp
- **Dashboard** — Income/expense trends, category breakdown, month-over-month
- **Ledger** — Full transaction history with filters and CSV export
- **Invoicing** — Create invoices with Paystack payment links, auto-follow-up
- **Inventory** — Product management with shareable catalog links
- **Payroll** — PAYE/Pension computation, payslip generation
- **Team & Roles** — Owner/Accountant/Staff with RBAC
- **Dead Letter Queue** — Review failed voice parses
- **Receipts** — Auto-generated for confirmed income transactions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TailwindCSS, Recharts |
| Backend | NestJS, Prisma, PostgreSQL |
| NLP | Python FastAPI, OpenAI Whisper, GPT-4o-mini |
| Auth | JWT, Passport |
| Payments | Paystack |
| Messaging | WhatsApp Cloud API |
| Cache | Redis |
| Deploy | Vercel (frontend), Railway (backend) |

## Project Structure

```
bookiee/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── common/   # Guards, middleware, decorators
│   │   └── prisma/   # Database service
│   └── prisma/       # Schema & migrations
├── python-service/   # FastAPI NLP microservice
│   └── app/
│       ├── routers/  # API endpoints
│       └── services/ # NLP logic
├── frontend/         # React dashboard
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
└── docs/             # PRD, architecture, schema docs
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for JWT signing
- `WHATSAPP_*` — WhatsApp Cloud API credentials
- `PAYSTACK_SECRET_KEY` — Paystack payment integration
- `OPENAI_API_KEY` — For voice transcription and NLP parsing
