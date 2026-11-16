# Delgone Digital Sales Ledger — System Requirements Specification

**Document Version:** 1.0.0  
**Target Organization:** Delgone Trading PLC (Addis Ababa, Ethiopia)  
**Industry:** Trading & Printing Supply Business  
**Status:** Approved for Phase 1 Technical Foundation  

---

## 1. Executive Summary

Delgone Trading PLC currently records business transactions using handwritten physical sales logbooks and paper receipt books. While handwritten ledgers have historically supported operations, they suffer from critical operational challenges:
- High risk of arithmetic and recording errors.
- Lack of instant visibility into cash and bank payment balances across sales shifts.
- Difficulty in monitoring overdue customer credit and tracking outstanding customer balances.
- Inability to quickly aggregate daily, weekly, or monthly revenue for managerial decision-making.
- Risk of physical ledger loss, damage, or unauthorized alteration.

The **Delgone Digital Sales Ledger** is a web-based, centralized sales and payment recording platform engineered to systematically replace physical paper ledgers. The platform provides real-time transaction recording, dual physical-to-digital receipt reconciliation, robust customer credit tracking, split-payment management, and granular auditability while remaining lightweight and intuitive for employees with basic computer literacy.

---

## 2. Stakeholders & Initial User Personas

| Role | Description | Responsibilities & Permissions |
| :--- | :--- | :--- |
| **Administrator** | Business Owner / Managing Director / Lead Accountant | Full system oversight; user account creation and credential management; audit log inspection; product catalog pricing controls; void approval and review; comprehensive financial and sales reporting. |
| **Sales Employee** | Front-desk sales personnel / Counter sales rep | Shift login; recording individual sales transactions; selecting catalog items or manually entering ad-hoc printing supplies; recording customer payments (cash, bank, credit); capturing paper receipt references. |

---

## 3. Functional Requirements

### 3.1 User Management & Security
- **FR-USR-01: Account Administration:** Administrators can create, update, activate, and deactivate employee accounts.
- **FR-USR-02: Individual Credentials:** Every employee must log in using distinct personal credentials. Shared accounts are strictly prohibited to ensure audit accountability.
- **FR-USR-03: Role-Based Access Control (RBAC):** Initial authorization defines two roles:
  - `Administrator`: Full access to all endpoints, configuration, logs, and reporting.
  - `Sales Employee`: Access restricted to transaction recording, customer lookup/creation, personal daily register review, and catalog lookup.
- **FR-USR-04: Session Security:** Token-based authentication (JWT) with secure expiration, password hashing via Argon2/Bcrypt, and automated session invalidation upon deactivation.

### 3.2 Sales Transaction Management
- **FR-SAL-01: Transaction Initiation:** Employees can initiate a new sale and record transactions in real time.
- **FR-SAL-02: Multi-Item Sales:** A single sale transaction can contain one or multiple distinct product lines.
- **FR-SAL-03: Catalog Selection:** Employees can search and select standard items from Delgone's saved product catalog (e.g., printing papers, toner cartridges, inks, binding supplies). Selecting a catalog item automatically populates unit price, description, and standard unit.
- **FR-SAL-04: Ad-Hoc / Manual Product Entry:** To accommodate custom printing orders, non-standard supplies, or specialized services, employees can manually input product descriptions and unit prices without requiring prior catalog entry.
- **FR-SAL-05: Unique Auto-Generated Sale Number:** Every sale receives an immutable, sequential, human-readable sale identifier (e.g., `DLG-202611-0001`).
- **FR-SAL-06: Physical Paper Receipt Reference:** System mandates capturing the serial number of the handwritten/physical paper receipt issued to the customer, bridging traditional paper records with digital entries.
- **FR-SAL-07: Employee Attribution:** The system automatically captures and permanently attributes the authenticated employee ID who authored the transaction.
- **FR-SAL-08: Historical Data Immutability (Snapshotting):** Historical sale line items must retain their exact captured description, unit price, and calculated subtotal at the moment of sale, unaffected by subsequent catalog price changes or name edits.

### 3.3 Payment & Credit Management
- **FR-PAY-01: Multi-Method Support:** The platform supports multiple payment channels:
  - **Cash:** Physical cash received at counter.
  - **Bank Transfer:** Direct bank deposits/transfers (Commercial Bank of Ethiopia - CBE, Awash, Dashen, etc.) with transaction reference/slip number capture.
  - **Mobile Money / Digital Wallets:** Telebirr, CBE Birr, etc.
  - **Credit Sales:** Sales released on credit terms with customer balance accrual.
- **FR-PAY-02: Split & Partial Payments:** A single transaction can be settled using multiple payment methods (e.g., 50% Cash + 50% Bank Transfer) or partial payments (e.g., 30% upfront, remaining 70% marked as credit).
- **FR-PAY-03: Subsequent Payment Recording:** Multiple subsequent payments can be applied against an existing sale over time until the balance is fully settled.
- **FR-PAY-04: Real-Time Balance Tracking:** Outstanding customer balances are computed dynamically as:
  $$\text{Outstanding Balance} = \text{Sale Grand Total} - \sum \text{Recorded Valid Payments}$$
- **FR-PAY-05: Duplicate Submission Prevention:** Idempotency checks and reference uniqueness verification prevent accidental double submissions of payment records.

### 3.4 Customer Management
- **FR-CST-01: Customer Profile Storage:** Store customer full names, telephone numbers, business/personal physical addresses, and optional tax identification numbers.
- **FR-CST-02: Transaction Linkage:** Sales can be linked directly to an existing or newly registered customer profile.
- **FR-CST-03: Walk-In / Casual Customers:** Support quick one-off sales for walk-in retail customers without requiring formal account creation.
- **FR-CST-04: Credit History Ledger:** Provide a unified customer statement showing total purchases, total payments settled, and current net outstanding credit balance.

### 3.5 Voiding & Audit Logging
- **FR-AUD-01: Soft Deletion & Zero Hard Deletion:** Financial records, sales, and payments must never be permanently deleted (`DELETE` statements forbidden in financial domain tables).
- **FR-AUD-02: Controlled Void Workflow:** Voiding a sale requires explicit manager/admin authorization, mandatory documented justification (void reason), and records `voided_at` and `voided_by`.
- **FR-AUD-03: System Audit Trail:** All state mutations (create, update, void) across sales, payments, customers, and catalog items must generate immutable audit log entries recording timestamp, actor ID, action type, entity identifier, previous state snapshot, and new state snapshot.

### 3.6 Reporting & Analytics (Phase 5 Target)
- **FR-REP-01: Daily Sales & Register Closeout:** Breakdown of daily transactions, total revenue, cash on hand, bank transfers, and new credit extended.
- **FR-REP-02: Periodic Sales Summaries:** Weekly, monthly, and custom date range aggregate sales figures.
- **FR-REP-03: Cash vs. Bank Reconciliation:** Detailed report comparing recorded cash intake against bank credit confirmations.
- **FR-REP-04: Aged Debtors & Credit Report:** Listing of customers with outstanding balances, overdue durations, and recent payment activity.

---

## 4. Fundamental Business Rules

1. **Official Operating Currency:** Ethiopian Birr (`ETB`). All monetary values are calculated and stored in ETB with two decimal places of precision (`NUMERIC(12, 2)`).
2. **Standard Timezone:** East Africa Time (`Africa/Addis_Ababa`, UTC+3). All database timestamps are timezone-aware (`TIMESTAMPTZ`).
3. **Line Subtotal Calculation:**
   $$\text{Line Subtotal} = \text{Quantity} \times \text{Unit Price}$$
4. **Grand Total Calculation:**
   $$\text{Grand Total} = \left( \sum_{i=1}^{n} \text{Line Subtotal}_i \right) - \text{Discount}$$
   Where $\text{Discount} \ge 0$ and $\text{Grand Total} \ge 0$.
5. **Outstanding Balance:**
   $$\text{Outstanding Balance} = \text{Grand Total} - \sum \text{Payments}$$
6. **Minimum Sale Completeness:** A sale cannot be created or finalized without at least one valid line item.
7. **Atomic Persistence:** A sale, its line items, and any initial payment must be committed to the database within a single atomic database transaction (ACID compliance). If any part fails, the entire transaction rolls back.
8. **Immutability of Historical Sales:** Changing a product's price or description in the catalog must never alter historical sale records.
9. **Author Attribution:** Every transaction and payment must record the user identity (`created_by` / `recorded_by`) who executed the action.

---

## 5. Non-Functional Requirements

### 5.1 Usability & Accessibility
- **Intuitive UI:** Optimized for employees with minimal digital accounting experience. Clean labels, large touch-friendly buttons (minimum 44x44px touch targets), high contrast, and zero confusing clutter.
- **Responsive & Mobile-First:** Fluidly usable on desktop PCs, laptops, Android smartphones, and tablets used across Delgone counters.

### 5.2 Performance & Reliability
- **Response Time:** API endpoints must respond in $<200\text{ ms}$ under normal counter operations.
- **Data Integrity:** Strict foreign key constraints and transactional isolation prevent orphan records and corrupted balances.
- **Availability:** Local containerized setup ensures Delgone's on-premise or cloud operations remain reliably accessible.

### 5.3 Extensibility & Standards
- **RESTful API:** Predictable resource-oriented URLs, standard HTTP status codes, and JSON payloads.
- **PWA Ready:** Manifest and service worker architecture prepared for future installability on mobile devices without app store overhead.
