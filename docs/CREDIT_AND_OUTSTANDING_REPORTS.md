# Delgone Digital Sales Ledger — Credit & Receivables Reporting

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Credit Sales vs Point-in-Time Outstanding Balances

The reporting module clearly separates two distinct metrics that management often confuses:
1. **Credit Sales in Period:** Measures the volume of new credit extended to clients during a specific timeframe.
2. **Current Outstanding Balance (Company Receivables):** Measures the point-in-time total amount owed by clients across the entire active ledger.

---

## 2. Credit Sales Report

### Endpoint
`GET /api/reports/credit-sales`

### Query Parameters
- `period`: `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `custom`
- `start_date`, `end_date`: Custom range bounds
- `customer_id`: Filter by specific debtor

### Financial Fields per Credit Transaction
- **Sale Number & FS Number:** Identifiers with leading zeros preserved.
- **Customer Name:** Clickable link navigating to customer profile and statement.
- **Sale Date:** Date invoice was created.
- **Grand Total:** Total purchase value.
- **Initial Down Payment:** Amount paid at the time of checkout.
- **Initial Credit Amount:** Initial debt extended ($\text{Grand Total} - \text{Down Payment}$).
- **Subsequent Settlements:** Additional payments received after checkout.
- **Current Outstanding Balance:** Remaining uncollected amount ($\text{Grand Total} - \text{Total Payments}$).
- **Status:** `partial` or `credit`.

---

## 3. Aging Analysis (Addis Ababa Business Brackets)

Delgone tracks uncollected balances categorized by standard commercial aging brackets:
- **0–30 Days (Current):** Fresh invoices, normal trade credit terms.
- **31–60 Days (Aging):** Past standard terms, reminder notices sent.
- **61–90 Days (Overdue):** High risk, credit hold placed on customer account.
- **>90 Days (Delinquent):** Escalated to management collection proceedings.

### Aging Calculation
Aging days are calculated as:
$$\text{Aging Days} = (\text{Today}_{\text{EAT}} - \text{Sale Date}_{\text{EAT}}).\text{days}$$

For customers with multiple invoices, each invoice is aged individually to provide an accurate breakdown of receivables risk.
