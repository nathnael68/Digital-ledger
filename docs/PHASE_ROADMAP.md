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

### Phase 1: Technical Foundation & Application Shell (Completed)
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

### Phase 2: Authentication, Employee Management & Dashboard (Completed)
- [x] Secure authentication with Bcrypt and signed JWT tokens in HttpOnly SameSite cookies (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`).
- [x] Anti-brute force sliding-window login rate limiting (5 failed attempts per 15 mins).
- [x] Role-Based Access Control (RBAC): `Administrator` and `Sales Employee` roles enforced on backend and frontend.
- [x] Employee account management (`/api/users` CRUD, role assignment, status toggling, password resets, self-deactivation protection).
- [x] First-administrator secure bootstrap CLI procedure (`backend/scripts/bootstrap_admin.py`).
- [x] Real-time operational dashboard (`GET /api/dashboard`) with 6 summary cards, 7-day sales trend, payment distribution, and recent transactions.
- [x] Financial data segregation (gross sales vs cash collections vs bank transfers vs credit balances; voided transaction exclusion).
- [x] Responsive navigation shell with user profile dropdown, active status badges, and role-filtered navigation items.
- [x] Comprehensive test suites (21 backend pytest tests + 6 frontend Vitest tests).
  - Unit of measure definition (pcs, ream, roll, pack, box).
  - Price management with active status toggles.
- **Customer Directory:**
  - Customer registry with search by name and phone number (`/api/v1/customers`).
  - Support for walk-in customer flag.

---

### Phase 3: Sales Management and Payment Recording (Completed)
- [x] Product catalog selection (`GET /api/products/search`) and manual ad-hoc product line entry.
- [x] Customer selection (`GET /api/customers/search`) and instant Walk-in customer counter toggle.
- [x] Mandatory Customs FS Number (`fs_number`) capture and optional Paper Receipt serial tracking (`paper_receipt_number`).
- [x] Safe, collision-free sequential sale numbering (`DL-YYYY-XXXX`) generated in Addis Ababa timezone (`Africa/Addis_Ababa`) with row locking on `SaleSequence`.
- [x] Multi-line item entry with server-enforced `Decimal` arithmetic (subtotal, discounts, grand total) and immutable price snapshots.
- [x] Complete payment recording: Cash, Bank Transfer (CBE, Awash, etc.), Telebirr, CBE Birr, Credit, down payments, and subsequent installments.
- [x] Financial integrity checks: overpayment blocking, negative value validation, discount limits, and payment blocking on voided sales.
- [x] Digital Sales Ledger interface (`/sales`) with multi-field search (Sale #, FS #, customer, receipt #, item description), status/method filters, and pagination.
- [x] Sale detail page (`/sales/:id`) with line items, financial breakdown, payment history records, and modal workflows.
- [x] Transaction metadata corrections (`PUT /api/sales/:id`) with mandatory justification and audit trail logging.
- [x] Transaction voiding (`POST /api/sales/:id/void`) with mandatory reason, preserving payments and excluding from active dashboard metrics.
- [x] Full real-time integration with Phase 2 dashboard metrics.
- [x] Comprehensive test suites: 28 backend tests in Pytest and 13 frontend tests in Vitest passing.

---

### Phase 4: Customer Management and Advanced Sales Ledger (Completed)
- [x] Complete customer management model and schema with company trade name, multiple contact numbers, email, address, and counter notes.
- [x] Intelligent duplicate customer detection on matching phone, email, or name+company with explicit staff confirmation workflow (`confirm_duplicate: true`).
- [x] Customer editing and account status lifecycle (`is_active: True/False`) with full audit trail diff logging. Inactive customers are protected and barred from new sales.
- [x] Customer Directory (`/customers`) with backend pagination, multi-field search, status filtering, multi-column sorting, and real-time financial totals (purchases, paid, outstanding balance).
- [x] Customer Profile & Statements (`/customers/:id`) with contact details, financial KPI cards (revenue, paid, balance due, open invoice counts), tabbed sales history, and payment voucher history.
- [x] Full audit reconciliation: voided sales are clearly visible and badged in customer statements while strictly excluded from active balances and lifetime totals.
- [x] Customer Outstanding Balances & Receivables (`/customers/outstanding`) with total receivables KPI and commercial aging breakdown (0–30, 31–60, 61–90, >90 days) calculated under the Addis Ababa timezone.
- [x] Advanced Sales Ledger (`/sales`) with multi-identifier search (Sale #, FS # with leading zeros, customer name, company, phone, receipt #, product description), multi-field filter bar (payment status, payment method, transaction status 'active'/'voided', balance filter, date range), and URL parameter synchronization.
- [x] Integration with counter sales (`/sales/new`): customer typeahead displays company name, filters inactive accounts, and supports counter quick-registration with duplicate warning.
- [x] Comprehensive test suites: 34 backend Pytest tests and 20 frontend Vitest tests (54 total tests passing).

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
