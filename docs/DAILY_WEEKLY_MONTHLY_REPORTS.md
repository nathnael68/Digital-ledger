# Delgone Digital Sales Ledger — Periodic Reporting Architecture

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Daily Sales Register Closeout

The Daily Sales Closeout report provides cashier end-of-day reconciliation and management audit for any selected calendar date.

### API Endpoint
`GET /api/reports/daily?report_date=YYYY-MM-DD`
- Defaults to the current Addis Ababa business date if omitted.

### Closeout Structure
1. **Financial KPI Header:**
   - **Daily Sales Revenue:** Sum of all non-voided sale grand totals created on this date.
   - **Cash Drawer Collections:** Physical cash received today (both counter down payments and subsequent debt settlements).
   - **Bank & Telebirr Collections:** Verified electronic receipts today with slip numbers.
   - **Discounts Awarded:** Total discounts applied across all daily tickets.
   - **Transaction Count:** Total valid sales created.
2. **Itemized Valid Sales Register:**
   - Sequential Sale Number (`DL-2026-XXXX`).
   - Official Fiscal Receipt Number (`FS Number`, preserving leading zeros e.g. `000451`).
   - Physical Paper Receipt Reference.
   - Timestamp in Addis Ababa local time.
   - Customer Name / Walk-in designation.
   - Cashier responsible.
   - Subtotal, Discount, Grand Total, Amount Paid, and Balance Due.
   - Direct link to full transaction audit view (`/sales/:id`).
3. **Voided Transactions Audit Section:**
   - Lists any transaction voided on this date.
   - Displays original grand total, cancellation timestamp, cashier/admin name, and mandatory justification reason (e.g. "Cashier printer paper jam duplicate").

---

## 2. Weekly & Monthly Performance Reports

### Endpoints
- `GET /api/reports/weekly?reference_date=YYYY-MM-DD`  
  Calculates the Monday-to-Sunday weekly period containing `reference_date`, compares performance against the previous Monday-to-Sunday week.
- `GET /api/reports/monthly?year=YYYY&month=M`  
  Calculates the full calendar month, compares performance against the previous calendar month.

### Analytical Components
- **7-Day / Daily Trend Breakdown:** Itemized table and comparative progress meters displaying daily revenue, cash in, bank/mobile money, and order volume.
- **Payment Method Distribution:** Segregates total cash, wire transfers, Telebirr, and CBE Birr with exact Ethiopian Birr volume and percentage share.
- **Growth Indicators:** Visual green/red badges indicating growth or decline in sales revenue, cash intake, bank transfers, and order count.

---

## 3. Custom Date-Range Reports

### Endpoint
`GET /api/reports/custom-range?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

### Validation Rules
- `start_date` and `end_date` must follow standard ISO 8601 `YYYY-MM-DD` format.
- Strict validation: If `start_date > end_date`, the backend returns HTTP 400 Bad Request with `"Start date cannot be after end date"`.
- Range boundaries are expanded to cover `start_date 00:00:00` to `end_date 23:59:59` in `Africa/Addis_Ababa`.
- Equivalent previous period is dynamically calculated with identical day length:
  $$\text{Delta Days} = (\text{end\_date} - \text{start\_date}).\text{days} + 1$$
  $$\text{Previous End Date} = \text{start\_date} - 1 \text{ day}$$
  $$\text{Previous Start Date} = \text{Previous End Date} - (\text{Delta Days} - 1) \text{ days}$$
