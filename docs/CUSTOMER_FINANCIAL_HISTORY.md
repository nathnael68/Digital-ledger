# Delgone Digital Sales Ledger — Customer Financial Statements & History

**Phase:** Phase 4  
**Target Organization:** Delgone Trading PLC (Addis Ababa, Ethiopia)  
**Status:** Implemented & Verified  

---

## 1. Overview & Purpose

Delgone Trading PLC requires clear visibility into each client's trading history to evaluate creditworthiness, reconcile statements with clients' accounting departments, and track payment compliance.

The Customer Profile & Financial Statements view (`/customers/:id`) consolidates real-time ledger metrics, historical sales transactions, and cash/bank payment vouchers.

---

## 2. Real-Time Financial Metric Calculations

Financial metrics are calculated directly from active, committed transactions in the database using exact `Decimal` arithmetic.

| Metric | Calculation Definition | Exclusion Rules |
| :--- | :--- | :--- |
| **Lifetime Revenue (Total Purchases)** | $\sum (\text{Sale.grand\_total})$ | Excludes voided sales (`Sale.voided_at IS NULL`) |
| **Total Amount Paid** | $\sum (\text{Payment.amount})$ across active sales | Excludes payments associated with voided sales |
| **Current Outstanding Due** | $\text{Lifetime Revenue} - \text{Total Amount Paid}$ | Excludes voided sales; represents net receivable |
| **Total Active Transactions** | Count of non-voided sales for the customer | Excludes voided sales |
| **Unpaid Sales Count** | Count of non-voided sales with `payment_status = 'credit'` | Excludes paid or partial sales |
| **Partial Sales Count** | Count of non-voided sales with `payment_status = 'partial'` | Excludes paid or credit sales |

---

## 3. Transaction History & Void Reconciliation

### Audit Visibility vs. Balance Distortion
A core architectural requirement for Delgone's digital ledger is audit transparency:
- **Never hard-delete or hide voided sales:** If a transaction was voided (e.g., due to an incorrect fiscal cash register FS entry or cashier correction), it must remain visible in the customer's transaction statement to explain gaps in invoice sequences.
- **Visual Segregation:** Voided sales are rendered with:
  - Prominent red `VOIDED` badge.
  - Strikethrough formatting on grand total.
  - Balance Due marked as *"Excluded (Void)"*.
  - Dimmed row opacity.
- **Mathematical Exclusion:** Voided sales contribute `0.00 ETB` to Lifetime Purchases, Total Amount Paid, and Outstanding Balance.

---

## 4. Payment Receipts & Settlement Ledger

The Customer Statement includes a dedicated **Payment Receipts** tab listing every monetary collection logged against the customer:
- **Payment Date & Time:** Formatted in Addis Ababa local business time.
- **Associated Sale Number:** Hyperlinked to the specific transaction (`/sales/:id`).
- **Fiscal FS Reference:** Cross-reference to the customs fiscal voucher.
- **Payment Method:** Tagged as `cash`, `bank_transfer`, `telebirr`, or `cbe_birr`.
- **Bank Slip / Ref:** Transaction confirmation code (e.g., CBE transaction reference or Telebirr SMS code).
- **Amount Received:** Exact Ethiopian Birr payment credit.
- **Recorded By:** Identity of the employee who validated and received the funds.
