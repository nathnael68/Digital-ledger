# Delgone Digital Sales Ledger — System Architecture

**Document Version:** 1.0.0  
**Target Organization:** Delgone Trading PLC  
**Author:** Lead Full-Stack Software Architect  

---

## 1. Architectural Overview

The **Delgone Digital Sales Ledger** is built on a modern, decoupled **Client-Server Single Page Application (SPA)** architecture. It utilizes a lightweight REST API backend powered by Python and FastAPI, a responsive TypeScript frontend built with React and Vite, and an enterprise-grade relational database powered by PostgreSQL.

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|   Desktop Browser / Tablet / Mobile Smartphone (PWA Installable)               |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                       React 18 / Vite / TypeScript                       |   |
|   |   - React Router v6 (SPA Navigation & Protected Routes)                 |   |
|   |   - Tailwind CSS (Accessible, Professional Counter UI)                  |   |
|   |   - Axios HTTP Client (Centralized Interceptors, JWT Handling)          |   |
|   |   - Lucide React (Visual Indicator Icons)                               |   |
|   |   - PWA Service Worker Shell (Manifest + Offline Asset Caching)        |   |
|   +-------------------------------------------------------------------------+   |
+----------------------------------------+----------------------------------------+
                                         | JSON over HTTP/REST (Port 8000)
                                         | Headers: Bearer JWT, Idempotency-Key
                                         v
+---------------------------------------------------------------------------------+
|                                BACKEND API LAYER                                |
|   FastAPI Application Server (Python 3.11+, Uvicorn ASGI)                       |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   | [Middleware] CORS, Logging, Request ID, Performance Metrics             |   |
|   +-------------------------------------------------------------------------+   |
|   | [API Router] /api/v1 (health, auth, sales, payments, customers, products) |   |
|   +-------------------------------------------------------------------------+   |
|   | [Pydantic V2 Schemas] Request Validation, Response Serialization        |   |
|   +-------------------------------------------------------------------------+   |
|   | [Service Layer] Business Rules, Grand Total Math, Number Generation     |   |
|   +-------------------------------------------------------------------------+   |
|   | [SQLAlchemy 2.0 ORM] Session Dependency, Unit of Work, Atomic Txns      |   |
|   +-------------------------------------------------------------------------+   |
+----------------------------------------+----------------------------------------+
                                         | TCP/IP (Port 5432)
                                         | Driver: psycopg3 (PostgreSQL Adapter)
                                         v
+---------------------------------------------------------------------------------+
|                               PERSISTENCE LAYER                                 |
|   PostgreSQL 16+ Relational Database Engine                                     |
|                                                                                 |
|   - Strict Constraints (Foreign Keys, NOT NULL, Check Constraints)              |
|   - ACID Transactions with Atomic Commits and Rollbacks                         |
|   - Precise Financial Numbers (NUMERIC(12,2))                                   |
|   - Timezone-Aware Timestamps (TIMESTAMPTZ in Africa/Addis_Ababa)               |
|   - Schema Versioning managed via Alembic Migrations                            |
|   - Persistent Storage via Docker Volume                                        |
+---------------------------------------------------------------------------------+
```

---

## 2. Technology Stack Justification

### 2.1 Backend: FastAPI, SQLAlchemy 2.0 & PostgreSQL
- **FastAPI (Python 3.11+):** High-throughput, asynchronous-ready framework with native Pydantic type validation. Automatic OpenAPI (Swagger) documentation provides an instant interactive contract for the frontend team.
- **SQLAlchemy 2.0:** Modern typed declarative mapping pattern (`Mapped[...]` and `mapped_column(...)`), transparent transaction management, explicit relationship loading, and complete abstraction of database dialect idiosyncrasies.
- **PostgreSQL 16+:** Relational database known for absolute data integrity, transactional reliability, robust constraint enforcement, and advanced indexing essential for financial ledgers.
- **Alembic:** Controlled, repeatable, zero-loss database migrations tracking schema evolution over time.

### 2.2 Frontend: React, Vite, TypeScript & Tailwind CSS
- **React 18/19 with Vite:** Instant Hot Module Replacement (HMR) during development, lightning-fast production bundle generation via Rollup, and a vast ecosystem of well-tested UI patterns.
- **TypeScript:** Enforces compile-time type safety across API schemas, sales calculations, and component props, virtually eliminating runtime `undefined` errors in financial calculations.
- **Tailwind CSS:** Utility-first styling framework enabling a sleek, consistent, and maintainable design system without runtime CSS overhead.
- **Axios:** Centralized HTTP request management with global error handling, request/response interceptors for JWT token injection, and structured cancellation.
- **Lucide React:** Lightweight, modern icon set providing visual cues for sales status, payment methods, and navigation.

---

## 3. Core Architectural Subsystems

### 3.1 Configuration & Environment Management
- Backend configuration is managed through Pydantic `BaseSettings` (`backend/app/core/config.py`).
- Environment variables are read from a `.env` file or host environment, strictly validated on application startup.
- Sensitive information (database credentials, JWT secret keys) are never hardcoded and are excluded from version control via `.gitignore`.
- Explicit `.env.example` templates document every configuration option with clear defaults.

### 3.2 Database Connection & Session Lifecycle
- Centralized database engine created with connection pooling (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`).
- Request-scoped database sessions provided through FastAPI's dependency injection (`get_db`).
- Guaranteed cleanup: Every session is automatically closed upon request completion, rolling back uncommitted changes if exceptions occur.

### 3.3 Security & Role-Based Access Control (RBAC)
- **Authentication (Phase 2):** Secure OAuth2 password bearer flow with JSON Web Tokens (JWT).
- **Password Security:** Salted hashes using Argon2 or Bcrypt.
- **Role Enforcement:** FastAPI dependencies verify user identity and check permissions (`require_admin`, `require_sales_employee`) before endpoint execution.
- **CORS (Cross-Origin Resource Sharing):** Explicitly restricted to approved origin domains defined in `CORS_ORIGINS`. Wildcard `*` origins are blocked when credentials are enabled.

### 3.4 Financial Accuracy & Arithmetic Safety
- Standard IEEE 754 floating-point numbers are strictly forbidden for currency.
- All monetary fields use PostgreSQL `NUMERIC(12, 2)` mapped to Python's `decimal.Decimal`.
- Computations follow banker's rounding (`ROUND_HALF_EVEN`) or strict standard decimal rounding to prevent fractional cent/centime discrepancies.

### 3.5 Atomic Transaction Processing (Unit of Work)
Sales transactions represent compound business entities:
1. Validate customer existence (or create walk-in).
2. Generate sequential `sale_number`.
3. Snapshot and insert multiple `SaleItem` rows.
4. Calculate and insert `Sale` master record.
5. Create initial `Payment` record(s) if settled immediately.
6. Record `AuditLog` entry.

All six operations execute within a single SQLAlchemy atomic transaction. If any item fails validation or database constraint check, the entire operation rolls back.

---

## 4. Frontend Application Architecture

```
frontend/src/
|-- assets/               # Static assets, branding logos, Delgone graphics
|-- components/           # Reusable UI primitives (Button, Modal, StatCard, Badge)
|-- layouts/              # Master layouts (AppLayout with Sidebar, Topbar, Responsive Nav)
|-- pages/                # Screen-level views
|   |-- DashboardPage.tsx     # High-level metrics, API health monitor, quick links
|   |-- NewSalePage.tsx       # Counter sales recording wizard (Phase 2+)
|   |-- SalesLedgerPage.tsx   # Searchable digital sales ledger table (Phase 2+)
|   |-- CustomersPage.tsx     # Customer directory & credit tracking (Phase 2+)
|   |-- ReportsPage.tsx       # Daily / periodic sales summaries (Phase 2+)
|   |-- SettingsPage.tsx      # System settings, receipt numbering series (Phase 2+)
|-- services/             # Axios API client, endpoint services (api.ts, healthService.ts)
|-- hooks/                # Custom React hooks (useApiHealth, usePWA, useLocalStorage)
|-- types/                # TypeScript interfaces matching backend Pydantic models
|-- utils/                # Formatting utilities (currencyFormatter, dateFormatter, pwa)
|-- App.tsx               # Route provider and global layout container
|-- main.tsx              # Application bootstrap & DOM mount
```

---

## 5. PWA (Progressive Web Application) Preparation

Delgone counter employees frequently use Android tablets or mobile phones. To eliminate Play Store / App Store deployment complexity while maintaining a native-app feel:
1. **Manifest File (`manifest.webmanifest`):** Configures display mode `standalone`, orientation `portrait-primary`, application name, primary navy blue theme (`#0f172a`), and app launcher icons.
2. **Service Worker Architecture:** Structured in `src/utils/pwa.ts` to register a service worker on production builds.
3. **Phase 1 Boundary:** PWA manifest and service worker shell are registered. No offline cache sync is performed in Phase 1; all writes require live API connectivity to prevent out-of-sync paper receipt duplication. Full offline drafting with conflict-free sync is scheduled for Phase 6.

---

## 6. Docker Containerization Architecture

A multi-container setup via `docker-compose.yml` ensures identical development and deployment environments:
- **`db` Service:** PostgreSQL container with named persistent volume `delgone_postgres_data` ensuring ledger data persists across container rebuilds.
- **`backend` Service:** Python FastAPI container running Uvicorn with hot-reload during development.
- **`frontend` Service:** Node.js Vite development server with hot-reload exposed on port 5173.
- **Internal Docker Network:** `delgone_network` isolating backend and database communications from external networks.
