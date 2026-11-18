# Delgone Digital Sales Ledger — Payment Collection Reports

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Cash vs Bank Segregation Principle

In retail and wholesale operations, mixing physical cash with bank deposits creates reconciliation errors and audit failures. The Delgone Ledger enforces strict separation between:
1. **Cash Drawer Collections:** Physical currency notes held in the store register.
2. **Bank & Mobile Collections:** Electronic funds received via CBE account transfers, Telebirr mobile wallet, or CBE Birr.

---

## 2. Cash Collections Report

### Endpoint
`GET /api/reports/cash-collections`

### Query Parameters
- `period`: `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `custom`
- `start_date`, `end_date`: For custom range selection
- `employee_id`: Filter by cashier who received the physical cash
- `customer_id`: Filter by customer

### Attributes Returned
- Payment Date and Time (Addis Ababa time)
- Sale Number (`DL-2026-XXXX`) with direct navigation link
- Official FS Number and Paper Receipt Reference
- Customer Name
- Cashier Name
- Cash Amount in ETB

---

## 3. Bank & Mobile Money Collections Report

### Endpoint
`GET /api/reports/bank-collections`

### Electronic Channels Supported
1. **Bank Transfer:** Direct CBE branch deposit or CBE Internet Banking wire.
2. **Telebirr:** Ethio Telecom mobile payment.
3. **CBE Birr:** Commercial Bank of Ethiopia mobile wallet.

### Slip Reference Auditing
Every non-cash payment record includes a mandatory or optional transaction reference / slip ID (`Payment.reference`). This allows management to verify each ledger entry directly against bank account statements and Telebirr merchant transaction logs.

---

## 4. Subsequent Payment Timing Principle

A critical accounting principle implemented in Phase 5:
> **Sales Revenue belongs to the date the sale was agreed and created.**  
> **Payment Collections belong to the date money actually changed hands.**

### Concrete Scenario:
1. On **Nov 1st**, a customer purchases 10,000 ETB of paper supplies on credit.
   - Nov 1st Sales Revenue = **+10,000 ETB**
   - Nov 1st Collections = **0 ETB**
   - Customer Outstanding Balance = **10,000 ETB**
2. On **Nov 18th**, the customer visits the store and pays 4,000 ETB in cash.
   - Nov 18th Sales Revenue = **0 ETB** (no new sale created)
   - Nov 18th Cash Collections = **+4,000 ETB** (physical cash in drawer)
   - Customer Outstanding Balance = **6,000 ETB**

The backend queries collections by `Payment.payment_date`, ensuring daily cash reconciliation matches the physical currency counted in the drawer at closing.
