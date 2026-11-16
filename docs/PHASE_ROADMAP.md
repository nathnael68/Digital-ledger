# Delgone Digital Sales Ledger — Development Phase Roadmap

**Target Organization:** Delgone Trading PLC  
**Platform:** Delgone Digital Sales Ledger  
**Version:** 1.0.0  

---

## Roadmap Overview

The transformation from Delgone's handwritten sales books to an enterprise-grade digital ledger is organized into six structured phases to ensure stability, continuous testing, user adoption, and zero financial data loss.

```
+---------------------------------------------------------------------------------+
| Phase 1: Technical Foundation, Architecture & Setup (CURRENT PHASE)              |
| - Requirements, Database Schema, Model Definitions, Docker, Health Check, Shell |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 2: Authentication, User Roles, Product Catalog & Customer Management       |
| - JWT Auth, User CRUD & RBAC, Products Catalog CRUD, Customer Directory         |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 3: Sales Recording Engine & Receipt Tracking                              |
| - Multi-line Sales Wizard, Catalog vs Manual Items, Auto Sale Number, Receipts |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 4: Payment Management, Split Settlement & Credit Ledger                   |
| - Cash/Bank/Mobile Money, Partial/Multi-Payments, Customer Statements, Balances |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 5: Management Reporting, Void Workflows & Audit Inspection                 |
| - Daily Register Closeout, Weekly/Monthly Summaries, Voiding with Justification |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 6: PWA Installability, Offline Sales Drafts & Production Hardening        |
| - Service Worker caching, Mobile Install Prompts, HTTPS, Backup Automation      |
+---------------------------------------------------------------------------------+
```

---

## Detailed Phase Breakdown

### Phase 1: Technical Foundation & Application Shell (Current Assignment)
- [x] Document functional and non-functional requirements (`docs/REQUIREMENTS.md`).
- [x] Formulate system architecture and technical decisions (`docs/SYSTEM_ARCHITECTURE.md`).
- [x] Design normalized relational database schema with Mermaid ER diagram (`docs/DATABASE_DESIGN.md`).
- [x] Establish backend project structure with FastAPI, SQLAlchemy 2.0, Pydantic v2, and Alembic.
- [x] Establish frontend project structure with React, Vite, TypeScript, and Tailwind CSS.
- [x] Implement database models (Users, Customers, Products, Sales, Sale Items, Payments, Audit Logs).
- [x] Configure database migrations with Alembic and verify initial migration generation.
- [x] Implement backend health check endpoint (`GET /api/health`).
- [x] Construct responsive frontend layout shell with sidebar navigation and placeholder pages.
- [x] Configure Docker Compose and local development environment.
- [x] Document setup instructions and open business decisions (`README.md`, `docs/OPEN_DECISIONS.md`).

---

### Phase 2: Authentication, Role-Based Access, & Core Catalogs
- **Authentication System:**
  - Login endpoint (`POST /api/v1/auth/login`) with JWT token issuance.
  - Current user endpoint (`GET /api/v1/auth/me`).
  - Secure password hashing with Argon2 / Bcrypt.
  - Role-based route guards in React frontend.
- **User Management (Admin Only):**
  - CRUD for employee accounts.
  - Activate/deactivate employee accounts.
  - Role assignment (`Administrator`, `Sales Employee`).
- **Product Catalog Management:**
  - Catalog list, search, add, edit, and archive (`/api/v1/products`).
  - Unit of measure definition (pcs, ream, roll, pack, box).
  - Price management with active status toggles.
- **Customer Directory:**
  - Customer registry with search by name and phone number (`/api/v1/customers`).
  - Support for walk-in customer flag.

---

### Phase 3: Sales Recording Engine & Paper Receipt Reconciliation
- **Digital Counter Sales Wizard:**
  - Fast, responsive point-of-sale interface designed for rapid counter entry.
  - Product item search with instant price auto-population.
  - Manual ad-hoc item entry for non-catalog custom supplies.
  - Real-time line subtotal, discount, and grand total calculations.
- **Transaction Engine:**
  - Sequential, collision-resistant sale number generation (`DLG-YYYYMM-XXXX`).
  - Mandatory paper receipt number capture for dual audit reconciliation.
  - Atomic transaction commitment (Sale + Line Items + Snapshots).
  - Price snapshotting to preserve historical financial records.
- **Sales Ledger Screen:**
  - Filterable transaction table (date range, payment status, employee, paper receipt #).
  - Printable sales receipt and transaction detail modal.

---

### Phase 4: Payment Management, Split Settlement & Credit Tracking
- **Multi-Method Payment Engine:**
  - Support for Cash, Bank Transfer (CBE, Awash, Dashen), Telebirr, and CBE Birr.
  - Reference number capture (bank slip / transaction ID) with duplicate check.
  - Split-payment modal (e.g. part cash, part bank transfer).
- **Credit & Outstanding Balance Tracking:**
  - Dynamic balance calculation per sale and aggregated per customer.
  - Subsequent payment recording against existing sales.
  - Automatic payment status progression (`pending` -> `partial` -> `paid` or `credit`).
  - Customer credit statement view with payment history.

---

### Phase 5: Reporting, Analytics & Managerial Audit Trails
- **Daily Register Closeout Report:**
  - Shift summary: Total sales, cash collected, bank payments, credit extended.
  - Reconciliation of physical paper receipt book serials against digital ledger.
- **Periodic Business Intelligence:**
  - Weekly and monthly revenue trends.
  - Top-selling printing supplies and paper products.
  - Outstanding debtors list with aging analysis.
- **Void & Correction Workflows:**
  - Void transaction modal with mandatory reason prompt.
  - Admin approval requirement for voiding finalized sales.
  - Reversal of balances and audit log recording.

---

### Phase 6: PWA Optimization, Offline Drafts & Production Deployment
- **Progressive Web App (PWA):**
  - Complete service worker implementation for offline UI asset loading.
  - "Add to Home Screen" installation on Android and iOS devices.
- **Offline Sales Drafts (Safe Counter Mode):**
  - Local draft saving when internet connectivity is interrupted.
  - Clear "Draft — Not Confirmed" visual watermarking to prevent duplicate receipts.
  - Manual synchronization workflow upon reconnecting.
- **Production Hardening:**
  - Automated PostgreSQL backup schedule (pg_dump cron).
  - SSL/TLS certificate setup with Nginx reverse proxy.
  - Rate limiting and production logging.
