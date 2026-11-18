# Delgone Digital Sales Ledger — Employee Sales Activity & Accountability

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Overview & Separation of Responsibilities

In multi-user retail and wholesale environments, accountability requires distinguishing between:
1. **Sales Generation:** Who negotiated and issued the digital sale transaction (`Sale.created_by`).
2. **Payment Collection:** Who physically received the cash or verified the bank deposit (`Payment.recorded_by`).

---

## 2. Employee Activity Report

### Endpoint
`GET /api/reports/employees`

### Access Control
- **Administrator:** Can view the complete breakdown across all employees to evaluate sales volume, drawer intake, and collection activity.
- **Sales Employee:** Only sees their own personal performance and collection totals.

### Metric Attributes
- **Employee Name & Username:** Staff identification.
- **Role:** Administrator or Sales Employee.
- **Sales Created Count:** Total non-voided sale tickets issued by this employee in the period.
- **Sales Revenue Generated:** Sum of `Sale.grand_total` for tickets issued by this employee.
- **Initial Cash at Counter:** Cash collected as down payments at checkout.
- **Initial Bank at Counter:** Bank transfers / Telebirr verified at checkout.
- **Initial Credit Issued:** Credit extended to customers on sales created by this employee.
- **Subsequent Debt Collections Recorded:** Collections received by this employee against existing outstanding invoices (including debt on invoices originally created by other staff members).
- **Total Inflow Handled:** Total money (cash + electronic) physically received or verified by this employee:
  $$\text{Total Collections} = \text{Initial Collections} + \text{Subsequent Collections}$$

---

## 3. Cash Drawer Reconciliation Protocol

At shift closeout, management compares each employee's **Total Cash Collections Handled** against the physical currency notes submitted from their cash drawer, providing zero-variance accountability.
