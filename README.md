# Delgone Digital Sales Ledger

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00.svg)](https://www.sqlalchemy.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

A web-based digital sales and cashier ledger application engineered for **Delgone Trading PLC**, an Ethiopian trading and printing-supply business located in Addis Ababa.

The platform systematically replaces handwritten paper sales logbooks with a centralized, auditable digital ledger. It provides dual receipt tracking (linking handwritten receipt serial numbers with auto-generated digital transaction numbers), multi-method payment splits (Cash, CBE, Awash, Telebirr, CBE Birr), real-time customer credit ledgering, and administrative oversight.

---

## 1. Technical Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide React Icons |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic, psycopg3 / psycopg2-binary |
| **Database** | PostgreSQL 16+ (Normalized schema, UUID primary keys, `NUMERIC(12,2)` Ethiopian Birr precision) |
| **DevOps** | Docker, Docker Compose, Git, Environment variables (`.env`) |
| **Regional Defaults** | Timezone: `Africa/Addis_Ababa` (UTC+3) • Currency: Ethiopian Birr (`ETB`) |

---

## 2. Project Directory Structure

```
Ledger/
├── .env.example                     # Root environment variables template
├── .gitignore                       # Multi-stack git ignore configuration
├── docker-compose.yml               # Multi-container orchestration (DB, API, Web)
├── alembic.ini                      # Root Alembic migration configuration
├── README.md                        # Project documentation and quickstart
├── docs/                            # Comprehensive engineering specifications
│   ├── REQUIREMENTS.md              # Functional & non-functional requirements
│   ├── SYSTEM_ARCHITECTURE.md       # Architecture diagrams and design patterns
│   ├── DATABASE_DESIGN.md           # Schema details and Mermaid ER diagram
│   ├── PHASE_ROADMAP.md             # 6-phase development delivery plan
│   └── OPEN_DECISIONS.md            # Documented business decisions for review
├── backend/
│   ├── .env.example                 # Backend environment template
│   ├── Dockerfile                   # Python 3.11 slim container definition
│   ├── requirements.txt             # Locked Python backend dependencies
│   ├── alembic.ini                  # Backend-specific Alembic runner
│   ├── migrations/                  # Database migration scripts and env.py
│   │   ├── env.py                   # Alembic environment with metadata binding
│   │   ├── script.py.mako           # Migration script generation template
│   │   └── versions/                # Generated revision versions
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory, CORS & request logging
│   │   ├── api/
│   │   │   ├── router.py            # API V1 router aggregation
│   │   │   └── routes/
│   │   │       └── health.py        # Health-check endpoint (GET /api/health)
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic BaseSettings & env parsing
│   │   │   └── logging.py           # Structured application logging
│   │   ├── db/
│   │   │   ├── base.py              # DeclarativeBase base class
│   │   │   └── session.py           # Engine pool, sessionmaker & get_db dependency
│   │   ├── models/                  # SQLAlchemy 2.0 ORM models
│   │   │   ├── user.py              # Users (Administrators, Sales Employees)
│   │   │   ├── customer.py          # Customers (B2B clients, walk-ins)
│   │   │   ├── product.py           # Products (Printing supplies catalog)
│   │   │   ├── sale.py              # Sales (Master sales transactions)
│   │   │   ├── sale_item.py         # Sale Items (Line items with price snapshot)
│   │   │   ├── payment.py           # Payments (Cash, Bank, Mobile transfers)
│   │   │   └── audit_log.py         # Audit Logs (Immutable mutation history)
│   │   ├── schemas/
│   │   │   └── health.py            # Pydantic schemas for API health response
│   │   └── services/                # Business logic services (Phase 2+)
│   └── tests/                       # Pytest test suite
│       ├── conftest.py              # Test database engine and API TestClient
│       ├── test_health.py           # Health endpoint and root route tests
│       ├── test_models.py           # Model definitions and relationship tests
│       └── test_config.py           # Settings and CORS parsing tests
└── frontend/
    ├── .env.example                 # Frontend environment template
    ├── Dockerfile                   # Multi-stage production container build
    ├── nginx.conf                   # Nginx reverse proxy for frontend container
    ├── package.json                 # Node dependencies and scripts
    ├── tsconfig.json                # TypeScript compiler configuration
    ├── vite.config.ts               # Vite bundler and development proxy
    ├── tailwind.config.js           # Custom Delgone navy and emerald color palette
    ├── postcss.config.js            # PostCSS configuration for Tailwind
    ├── index.html                   # HTML entrypoint with PWA meta tags
    ├── public/
    │   ├── manifest.webmanifest     # PWA standalone manifest configuration
    │   └── icons/                   # App launcher icons (SVG / PNG)
    └── src/
        ├── App.tsx                  # React Router navigation tree
        ├── main.tsx                 # React DOM mount and PWA registration
        ├── index.css                # Tailwind directives and base typography
        ├── components/              # Header, Sidebar, StatCard, StatusBadge
        ├── layouts/                 # AppLayout shell with mobile drawer
        ├── pages/                   # Screen views (Dashboard, New Sale, Ledger...)
        ├── hooks/                   # useApiHealth hook
        ├── services/                # Axios instance (api.ts) & healthService.ts
        ├── types/                   # TypeScript interfaces
        └── utils/                   # Currency formatters & PWA helpers
```

---

## 3. Quickstart & Local Setup

### Prerequisites
- **Git**
- **Docker & Docker Compose** (Recommended for local containerized development)
- *Alternatively for native execution:* **Python 3.11+**, **Node.js 18+**, and **PostgreSQL 16+**.

---

### Option A: Running with Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Ledger
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start the containers:**
   ```bash
   docker compose up --build -d
   ```

4. **Apply database migrations:**
   ```bash
   docker compose exec backend alembic upgrade head
   ```

5. **Access the application:**
   - **Frontend Application Shell:** [http://localhost:5173](http://localhost:5173)
   - **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **API Health Check Endpoint:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option B: Running Natively on Local Machine

#### 1. Backend Setup (FastAPI & PostgreSQL)

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# Run database migrations
alembic upgrade head

# Bootstrap the initial Administrator account securely (prompted or via flags)
python scripts/bootstrap_admin.py --username admin --full-name "Managing Director" --password "YourSecurePassword123!"

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup (React & Vite)

```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment
cp .env.example .env

# Start Vite development server
npm run dev
```

The frontend will run at [http://localhost:5173](http://localhost:5173) and automatically proxy `/api` requests to the FastAPI backend.

---

## 4. Verification & Testing

### Backend Test Suite (Pytest)
Run the automated pytest suite (tests authentication, rate limiting, permissions, model integrity, sales creation, validation, collision-safe numbering, payment installments, voiding, real database dashboard calculations, customer duplicate detection, customer lifecycle, audit logs, outstanding receivables, aging brackets, and advanced ledger search/sort):
```bash
# Run all 34 backend tests:
pytest backend/tests -v
```

### Frontend Test Suite (Vitest)
Verify frontend components, customer directory, duplicate warning modals, customer statements, outstanding aging receivables, advanced sales ledger, counter sales entry, detail view, authentication, and role-based navigation:
```bash
cd frontend
npm test
# (All 20 tests pass)
```

### Frontend Production Build & Typecheck
Verify TypeScript compilation and bundle generation:
```bash
cd frontend
npm run build
```

---

## 5. Engineering Documentation Index

- [Customer Management Specification](docs/CUSTOMER_MANAGEMENT.md) — Customer contact models, duplicate warning workflows, account lifecycle (active/inactive), and counter integration.
- [Customer Financial Statements & History](docs/CUSTOMER_FINANCIAL_HISTORY.md) — Real-time ledger metrics, lifetime revenue, payment receipts, and voided sale reconciliation.
- [Outstanding Balances & Aging Receivables](docs/OUTSTANDING_BALANCES.md) — Aging brackets (0–30, 31–60, 61–90, >90 days), Addis Ababa business calendar, and receivables API.
- [Advanced Sales Ledger Specification](docs/ADVANCED_SALES_LEDGER.md) — Multi-identifier search, multi-field filters, column sorting, and URL search parameter synchronization.
- [Sales Workflow Documentation](docs/SALES_WORKFLOW.md) — Counter sales procedures, catalog vs. manual item entry, FS number compliance, and review modals.
- [Payment Logic & Precision](docs/PAYMENT_LOGIC.md) — Exact Decimal math, rounding, payment states (Paid, Partial, Credit, Voided), and concurrency locks.
- [Sales Management REST API](docs/SALES_API.md) — Complete endpoint reference for sales, items, payments, ledger querying, products, and customers.
- [Transaction Audit & Voiding Policy](docs/TRANSACTION_AUDIT_AND_VOIDING.md) — Correction audit trail logging, justification rules, and revenue exclusion.
- [Authentication & Session Architecture](docs/AUTHENTICATION.md) — HttpOnly cookie strategy, bcrypt hashing, rate limiting, and bootstrap procedure.
- [Role-Based Access Control (RBAC)](docs/USER_ROLES_AND_PERMISSIONS.md) — Administrator vs Sales Employee permissions and defense-in-depth guards.
- [Financial Dashboard Specification](docs/DASHBOARD.md) — Real-time formulas, cash vs bank segregation, and 7-day trend calculations.
- [System Requirements Specification](docs/REQUIREMENTS.md) — Functional and non-functional requirements, sales workflows, and business rules.
- [System Architecture Specification](docs/SYSTEM_ARCHITECTURE.md) — 3-tier architecture, technology justifications, security, and PWA roadmap.
- [Database Design & Schema](docs/DATABASE_DESIGN.md) — Normalized table structures, data types, indexes, and Mermaid ER diagram.
- [Development Phase Roadmap](docs/PHASE_ROADMAP.md) — 6-phase implementation roadmap and deliverable checklist.
- [Open Decisions Log](docs/OPEN_DECISIONS.md) — Decisions on receipt book numbering, VAT vs. TOT tax policies, and credit controls.

---

## 6. License & Ownership

Confidential and proprietary business software engineered for **Delgone Trading PLC**, Addis Ababa, Ethiopia. All rights reserved.
