# Transaction Audit, Corrections & Voiding Policy

## 1. Regulatory Rationale & Immutability

In compliance with Ethiopian financial regulations, digital sales ledgers serving commercial businesses such as Delgone Trading PLC cannot allow arbitrary deletion or silent modification of sales records.

Once a sale transaction is finalized:
1. **Financial Records Are Permanent**: Transactions are never hard-deleted from the database (`DELETE FROM sales` is strictly forbidden).
2. **Sale Numbers are Sequential and Immutable**: A sale number (e.g. `DL-2026-0001`) remains tied to that transaction forever and is never re-used, even if the transaction is subsequently voided.
3. **Item Snapshots are Preserved**: Historical line items freeze the exact product description, unit, quantity, and unit price as of the sale date.

---

## 2. Transaction Corrections Workflow

Counter clerks occasionally make clerical errors in documentation references, such as entering an incorrect paper receipt serial number or mistyping a customs FS number.

### Permitted Corrections
- **Customs FS Number** (`fs_number`)
- **Paper Receipt Number** (`paper_receipt_number`)
- **Transaction Notes** (`notes`)

### Strict Correction Constraints
1. **Financial Quantities Are Protected**: Line items, quantities, discounts, and prices cannot be modified via correction. If goods or quantities were recorded erroneously, the transaction must be voided with reason and re-recorded.
2. **Mandatory Justification Reason**: Any update requires a minimum 3-character reason explaining why the modification is being executed.
3. **Audit Trail Logging**:
   - The application writes an entry to `audit_logs` capturing:
     - `table_name`: `"sales"`
     - `record_id`: UUID of the sale
     - `action`: `"CORRECTION"`
     - `old_values`: `{ "fs_number": "...", "paper_receipt_number": "..." }`
     - `new_values`: `{ "fs_number": "...", "paper_receipt_number": "..." }`
     - `user_id`: ID of employee making the change
     - `created_at`: Exact timestamp (UTC / Addis Ababa)
     - `reason`: The entered justification text.

---

## 3. Transaction Voiding Workflow

When an order is canceled, returned prior to fulfillment, or entered duplicate by accident, authorized staff may void the transaction.

### Voiding Rules
1. **Mandatory Void Reason**: Staff must submit a clear explanation (e.g. `"Customer cancelled order prior to cutting vinyl roll"`).
2. **Status Mutation**:
   - `payment_status` is updated to `"voided"`.
   - `voided_at` is stamped with the current timestamp.
   - `voided_by` records the user ID of the staff member who executed the void.
   - `void_reason` stores the justification.
3. **Exclusion from Active Revenue**:
   - Voided sales are automatically excluded from the active dashboard:
     - Today's Sales sum excludes voided sales.
     - Cash and bank payment sums exclude payments associated with voided sales.
     - 7-day sales trends exclude voided sales.
     - Recent counter transactions exclude voided sales.
4. **Payment Blocking**:
   - Any attempt to record subsequent payments on a voided sale is rejected by the backend with HTTP 400 (`Cannot record payment against a voided sale`).
5. **Ledger Visibility**:
   - Voided sales remain visible in the Digital Sales Ledger marked with a red `"Voided"` badge and highlighted row for complete audit reconciliation with physical receipt books.
