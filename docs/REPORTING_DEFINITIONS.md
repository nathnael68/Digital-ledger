# Delgone Digital Sales Ledger — Financial Reporting Definitions

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Overview & Architectural Principles

All financial reports in the Delgone Digital Sales Ledger derive strictly from actual database records (`sales`, `sale_items`, `payments`, `users`, and `customers`). No hardcoded, mock, or fabricated financial values are ever presented.

All financial logic is consolidated into a single, centralized backend service (`backend/app/services/report_service.py`) to prevent discrepancies across endpoints, screens, and file exports.

---

## 2. Core Financial Definitions & Formulas

### A. Sales Revenue
- **Definition:** The total business sales generated within a given period, based on the **creation date** of the transactions (`Sale.sale_date`).
- **Inclusion / Exclusion:**
  - Includes: All active transactions (`paid`, `partial`, `credit`).
  - **Excludes:** Voided transactions (`Sale.voided_at IS NOT NULL`).
- **Timing Rule:** A transaction executed today counts toward today's sales revenue in its entirety, regardless of whether it was paid in cash, settled via bank transfer, or extended as credit.
- **Formula:**
  $$\text{Sales Revenue} = \sum_{\text{active sales in period}} \text{Sale.grand\_total}$$

### B. Cash Collections
- **Definition:** Physical Ethiopian Birr cash collected into the store drawer within the period.
- **Timing Rule:** Based strictly on the **actual receipt date** (`Payment.payment_date`), NOT the original sale date.
- **Subsequent Payment Rule:** If an employee collects 3,000 ETB cash today to settle an invoice issued two weeks ago, that 3,000 ETB belongs to **today's Cash Collections**, but does **NOT** alter today's Sales Revenue.
- **Formula:**
  $$\text{Cash Collections} = \sum_{\substack{\text{Payment.payment\_method} = \text{'cash'} \\ \text{Payment.payment\_date} \in \text{period} \\ \text{Sale is not voided}}} \text{Payment.amount}$$

### C. Bank Collections (Electronic Funds)
- **Definition:** Verified digital inflows received via Commercial Bank of Ethiopia (CBE) transfer, Telebirr mobile wallet, or CBE Birr within the period.
- **Payment Methods:**
  - `bank_transfer` (Direct wire / CBE deposit)
  - `telebirr` (Ethio Telecom mobile wallet)
  - `cbe_birr` (CBE mobile banking)
- **Reference Requirement:** Each electronic payment record captures an audited slip reference or mobile transaction ID (`Payment.reference`).
- **Timing Rule:** Based on `Payment.payment_date` falling within the period.
- **Formula:**
  $$\text{Bank Collections} = \sum_{\substack{\text{Payment.payment\_method} \in \{\text{'bank\_transfer'}, \text{'telebirr'}, \text{'cbe\_birr'}\} \\ \text{Payment.payment\_date} \in \text{period} \\ \text{Sale is not voided}}} \text{Payment.amount}$$

### D. Credit Sales Created in Period
- **Definition:** The unpaid credit portion extended to clients at checkout during the selected period.
- **Initial Credit Formula:**
  $$\text{Initial Credit Granted} = \text{Sale.grand\_total} - \text{Initial Down Payment}$$
- **Current Balance Formula:**
  $$\text{Current Outstanding Balance} = \text{Sale.grand\_total} - \sum \text{All Payments Received to Date}$$

### E. Current Outstanding Balance (Company Receivables)
- **Definition:** A **point-in-time snapshot** of all uncollected debt across all non-voided transactions in company history.
- **Scope:** Unlike periodic sales revenue, outstanding receivables represent the actual live ledger balance owed by customers at this exact moment.
- **Formula:**
  $$\text{Total Company Receivables} = \sum_{\text{active sales in DB}} \text{Sale.grand\_total} - \sum_{\text{active payments in DB}} \text{Payment.amount}$$

### F. Voided Sales (Audit Isolation)
- **Rule:** Voided transactions are **never deleted** from the database.
- **Reporting Rule:** Voided transactions are strictly segregated into a dedicated Audit section. They display original totals, cancellation timestamps, and mandatory justifications, but are zeroed out from active sales revenue, cash totals, and receivables.

---

## 3. Addis Ababa Business Timezone Rules

- **Standard Timezone:** `Africa/Addis_Ababa` (UTC+3, East Africa Time - EAT).
- **Day Boundaries:** `00:00:00.000000` to `23:59:59.999999` EAT.
- **Week Boundaries:** Monday `00:00:00` EAT to Sunday `23:59:59` EAT (standard Ethiopian business workweek alignment).
- **Month Boundaries:** First calendar day `00:00:00` EAT to the final calendar day `23:59:59` EAT.
- **Storage vs Reporting:** Timestamps stored in UTC in SQLite/PostgreSQL are converted to `Africa/Addis_Ababa` using Python `zoneinfo.ZoneInfo("Africa/Addis_Ababa")` before period comparison logic is applied.

---

## 4. Comparison Metrics & Growth Percentages

Overview metrics provide automated comparison against the previous equivalent period:
- **Today vs Yesterday:** Compares today's metrics to yesterday's identical 24-hour window.
- **This Week vs Last Week:** Compares current week to date against the identical Monday-to-Sunday period of the previous week.
- **This Month vs Last Month:** Compares current month against the previous calendar month.

**Percentage Delta Formula:**
$$\text{Percentage Change} = \begin{cases} 
\left(\frac{\text{Current} - \text{Previous}}{\text{Previous}}\right) \times 100\% & \text{if } \text{Previous} > 0 \\
100.0\% & \text{if } \text{Previous} = 0 \text{ and } \text{Current} > 0 \\
0.0\% & \text{if } \text{Previous} = 0 \text{ and } \text{Current} = 0
\end{cases}$$
