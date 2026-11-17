# Delgone Digital Sales Ledger — Outstanding Balances & Aging Receivables

**Phase:** Phase 4  
**Target Organization:** Delgone Trading PLC (Addis Ababa, Ethiopia)  
**Status:** Implemented & Verified  

---

## 1. Overview & Purpose

Delgone Trading PLC regularly provides offset printing supplies on short-term trade credit to verified printing houses and publishers. Monitoring receivables aging is critical for managing working capital and minimizing bad debts.

The Outstanding Balances module (`/customers/outstanding`) tracks total company receivables and categorizes unpaid balances into aging brackets calculated under the `Africa/Addis_Ababa` business calendar.

---

## 2. Aging Bucket Architecture

Aging is calculated dynamically based on the transaction date of unsettled sales (`payment_status IN ('credit', 'partial')` and `Sale.voided_at IS NULL`).

$$\text{Age in Days} = \text{Current Date in Addis Ababa} - \text{Sale Date in Addis Ababa}$$

The system aggregates balances into four standard commercial brackets:

| Bracket | Time Range | Commercial Classification |
| :--- | :--- | :--- |
| **0–30 Days** | $0 \le \text{Days} \le 30$ | Current / Standard credit term |
| **31–60 Days** | $31 \le \text{Days} \le 60$ | Follow-up required |
| **61–90 Days** | $61 \le \text{Days} \le 90$ | Urgent reminder / Credit review |
| **Over 90 Days** | $\text{Days} > 90$ | Overdue / Suspension candidate |

### Important Operational Note
Aging buckets serve as analytical classification categories and do not enforce automated legal interest or penalties. Legal credit terms remain governed by Delgone management policies (see `docs/OPEN_DECISIONS.md` OD-10).

---

## 3. Aging Receivables API & Features

### Endpoint
`GET /api/customers/outstanding`

### Supported Parameters
- `aging_bucket`: Filter customers who have unpaid balances in a specific bracket (`0_30`, `31_60`, `61_90`, `over_90`, or `all`).
- `min_balance` & `max_balance`: Numerical balance thresholds in Ethiopian Birr.
- `search`: Filter by customer name, company name, or phone number.
- `sort_by`: Sort by `outstanding_balance` (default), `name`, `company_name`, or `oldest_unpaid`.
- `sort_order`: `asc` or `desc`.
- `page` & `page_size`: Pagination parameters.

### Response Data Structure
- `total_receivables`: Aggregate gross credit outstanding across all filtered customers.
- `items`: Customer breakdown including:
  - Total Purchases & Total Paid
  - Total Outstanding Balance
  - Exact breakdown across `aging_0_30`, `aging_31_60`, `aging_61_90`, and `aging_over_90`
  - Date of oldest unpaid sale
  - Date of last recorded payment
  - Count of unpaid sales
