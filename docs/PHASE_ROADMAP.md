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

### Phase 5: Reports, Financial Analytics and Data Export (Completed)
- [x] Centralized, audit-compliant financial service (`backend/app/services/report_service.py`) computing all reporting metrics from real database records without conflicting logic.
- [x] Core financial definitions enforced: Sales Revenue calculated from valid sale creation dates, Collections calculated from actual payment receipt dates (subsequent payments belong to collection date, not sale date), Point-in-time Outstanding Receivables, and strict exclusion of voided sales from revenue.
- [x] Timezone-aware date boundaries in `Africa/Addis_Ababa` (UTC+3) for Daily, Weekly (Monday–Sunday), Monthly, and validated Custom ranges.
- [x] Executive Management Overview (`/api/reports/overview`) with 7 summary KPI cards, previous equivalent period comparison metrics and growth badges, daily revenue/collections trend table, and payment method distribution meters.
- [x] Daily Sales Closeout Report (`/api/reports/daily`) with daily metrics, itemized valid sales register (Sale #, FS #, Receipt #, Time, Customer, Cashier, Grand Total, Paid, Balance Due, Status), and dedicated Voided Transactions Audit section with mandatory justification.
- [x] Weekly, Monthly, and Custom Date-Range Reports (`/api/reports/weekly`, `/api/reports/monthly`, `/api/reports/custom-range`) with validation rejecting inverted date ranges.
- [x] Cash vs Bank Collection Segregation: Cash Collections (`/api/reports/cash-collections`) and Bank/Mobile Collections (`/api/reports/bank-collections`) covering Bank Transfers, Telebirr, and CBE Birr with audited slip references.
- [x] Credit Sales & Aging Report (`/api/reports/credit-sales`) tracking initial credit extended at checkout versus subsequent settlements and remaining uncollected balance.
- [x] Employee Sales Activity & Accountability (`/api/reports/employees`) strictly distinguishing sales creation from subsequent payment collection recording.
- [x] Customer Purchasing & Balance Aggregation (`/api/reports/customers`) with filtering for active debtors versus settled accounts.
- [x] Excel Data Export (`openpyxl`) with explicit text cell formatting (`cell.number_format = "@"`, `cell.data_type = 's'`) strictly preserving leading zeros in FS numbers and receipt numbers (e.g. `000451`).
- [x] PDF Document Export (`reportlab`) with Delgone corporate branding, two-pass dynamic page numbering ("Page X of Y"), and clean tabular layout.
- [x] Interactive Frontend Reports Hub (`/reports` in React/TypeScript/Tailwind) featuring period switchers, sub-navigation tabs, itemized tables with links, and universal one-click Excel & PDF export buttons.
- [x] Comprehensive automated test coverage: 41 backend Pytest tests (including 7 report tests) and 26 frontend Vitest tests (including 6 report tests) — 67 total tests passing 100%.

---

### Phase 6: Production Readiness, PWA, Deployment & Security (Completed)
- [x] Initial full-stack application audit documented in `docs/PHASE_AUDIT_REPORT.md`.
- [x] Progressive Web App (PWA) with valid `manifest.webmanifest`, standalone display mode, `#0F172A` theme color, and high-resolution icons (192px, 512px, SVG, and iOS `apple-touch-icon`).
- [x] Service worker (`sw.js`) caching core app shell and providing clean HTTP 503 offline diagnostics for API attempts.
- [x] Offline awareness banner in `Header.tsx` via `useNetworkStatus` hook with explicit messaging that financial transactions require an active connection.
- [x] One-click "Install App" prompt in header with native `beforeinstallprompt` handling and diagnostics modal.
- [x] Complete employee mobile and desktop installation guide in `docs/PWA_INSTALLATION_GUIDE.md`.
- [x] Full System Settings & Profile Hub (`/settings`) with company profile, password change workflow (`POST /api/auth/change-password`), fiscal receipt rules, PWA diagnostics, and admin quick links.
- [x] Automated database backup script (`scripts/backup_db.sh` and `scripts/backup_db.ps1`) with daily, weekly, and monthly retention tiers, gzip compression, and SHA-256 integrity verification.
- [x] Automated database restoration script (`scripts/restore_db.sh` and `scripts/restore_db.ps1`) with connection termination, integrity verification, and table count validation.
- [x] Automated backup and restore test suite (`backend/tests/test_backup_restore.py`) verifying schema, transactions, financial fields, and tampered checksum detection.
- [x] Production Docker Compose stack (`docker-compose.prod.yml`) with isolated database (no exposed public ports), production multi-worker Gunicorn backend (`backend/Dockerfile.prod`), static Nginx frontend (`frontend/Dockerfile.prod`), and automated Certbot SSL renewer.
- [x] Production Nginx reverse proxy configuration (`nginx/nginx.conf`, `nginx/conf.d/delgone.conf`) with HTTP->HTTPS redirection, Let's Encrypt ACME challenges, modern TLS ciphers, HSTS, security headers, and brute-force rate limiting.
- [x] Production environment template (`.env.production.example`) with secure password generation instructions.
- [x] Comprehensive 13-step Ubuntu VPS deployment guide in `docs/DEPLOYMENT_GUIDE.md`.
- [x] Comprehensive database reliability and disaster recovery documentation in `docs/BACKUP_AND_RESTORATION.md`.
- [x] Complete security audit and hardening report in `docs/SECURITY_AUDIT_AND_HARDENING.md`.
- [x] Version control: Published to GitHub under `https://github.com/nathnael68/Digital-ledger`.
- [x] Test coverage: 43 backend Pytest tests (including backup/restore test) and 28 frontend Vitest tests (including settings tests) — 71 total automated tests passing 100%.
