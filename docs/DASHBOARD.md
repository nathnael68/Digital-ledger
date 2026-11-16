# Delgone Digital Sales Ledger — Financial Dashboard Specification

**Document Version:** 2.0.0  
**Phase:** Phase 2 Implementation  
**Target Organization:** Delgone Trading PLC  
**Author:** Lead Full-Stack Software Architect  

---

## 1. Core Financial Business Rules & Data Segregation

The Delgone Digital Sales Ledger dashboard provides management and counter sales personnel with real-time operational metrics calculated directly from relational database records.

### Critical Financial Invariants
1. **Sales Revenue $\ne$ Cash Collected:**  
   Total Sales Revenue represents the total value of products committed and delivered to customers. Cash Collected represents only physical fiat currency received into the cash drawer.
2. **Credit Sales Inclusions:**  
   Credit sales contribute to total gross sales but produce zero immediate cash collections.
3. **Cash vs. Bank Segregation:**  
   Payments received via bank transfers (Commercial Bank of Ethiopia, Awash Bank, Dashen Bank) or mobile money (Telebirr, CBE Birr) are segregated from counter cash to enable accurate physical cash drawer closeouts.
4. **Outstanding Balance Integrity:**  
   $$\text{Outstanding Balance} = \sum_{\text{active sales}} \text{Grand Total} - \sum_{\text{active sales}} \text{Recorded Payments}$$
5. **Strict Void Exclusion:**  
   Voided transactions (`voided_at IS NOT NULL`) are completely excluded from sales revenue, payment totals, 7-day trends, and recent transaction feeds.
6. **Zero Hardcoded Figures:**  
   All metrics, charts, and table rows are derived from actual SQL database queries. When the database contains no sales records, all metrics strictly reflect `0.00 ETB` with an intuitive empty state.

---

## 2. Metric Computation Formulas

| Metric | Source Table(s) | Computation Logic | Purpose |
| :--- | :--- | :--- | :--- |
| **Today's Sales** | `sales` | $\sum \text{grand\_total}$ where `voided_at IS NULL` and `sale_date` falls on current calendar day (Africa/Addis_Ababa). | Real-time shift gross sales |
| **Cash Received** | `payments` $\bowtie$ `sales` | $\sum \text{amount}$ where `payment_method = 'cash'` and `sales.voided_at IS NULL`. | Physical drawer cash reconciliation |
| **Bank Received** | `payments` $\bowtie$ `sales` | $\sum \text{amount}$ where `payment_method IN ('bank_transfer', 'telebirr', 'cbe_birr')` and `sales.voided_at IS NULL`. | Digital and bank deposit tracking |
| **Credit Sales** | `sales` | $\sum \text{grand\_total}$ where `payment_status = 'credit'` and `voided_at IS NULL`. | Active credit exposure |
| **Outstanding Balance** | `sales`, `payments` | $\max(0, \text{Total Active Sales} - \text{Total Active Payments})$. | Net collectible debtor balance |
| **Total Transactions** | `sales` | $\text{Count}(\text{sales.id})$ created today where `voided_at IS NULL`. | Counter velocity & volume |

---

## 3. Seven-Day Sales Trend & Payment Distribution

### 3.1 Seven-Day Trend
- Computes daily sales totals for each of the last 7 calendar days ending today (using East Africa Time, `Africa/Addis_Ababa`).
- Returns `date` (ISO-8601), `day_label` (e.g., `Mon, Nov 16`), `total_sales` (ETB), and `transaction_count`.
- Frontend renders a responsive SVG bar chart with hover tooltips and dynamic relative scaling.

### 3.2 Payment Method Distribution
- Groups active payments by `payment_method`:
  - `cash` &rarr; Cash
  - `bank_transfer` &rarr; Bank Transfer
  - `telebirr` &rarr; Telebirr
  - `cbe_birr` &rarr; CBE Birr
- Calculates percentage share and total collected amount per method.

---

## 4. API Specification (`GET /api/dashboard`)

- **Security:** Requires authenticated active user session.
- **Example Response (Empty Database State):**
  ```json
  {
    "summary": {
      "today_sales": "0.00",
      "cash_received": "0.00",
      "bank_received": "0.00",
      "credit_sales": "0.00",
      "outstanding_balance": "0.00",
      "total_transactions": 0
    },
    "trend_7_days": [
      { "date": "2026-11-10", "day_label": "Tue, Nov 10", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-11", "day_label": "Wed, Nov 11", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-12", "day_label": "Thu, Nov 12", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-13", "day_label": "Fri, Nov 13", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-14", "day_label": "Sat, Nov 14", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-15", "day_label": "Sun, Nov 15", "total_sales": "0.00", "transaction_count": 0 },
      { "date": "2026-11-16", "day_label": "Mon, Nov 16", "total_sales": "0.00", "transaction_count": 0 }
    ],
    "payment_methods": [],
    "recent_transactions": []
  }
  ```
