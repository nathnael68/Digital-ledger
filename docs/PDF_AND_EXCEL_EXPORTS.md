# Delgone Digital Sales Ledger — PDF & Excel Export Architecture

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 5: Reports, Financial Analytics & Data Export

---

## 1. Overview

Delgone Ledger provides server-side document generation for both spreadsheet analysis (`.xlsx`) and formal audit presentations (`.pdf`).

All exports are generated on demand from live database records and streamed with proper HTTP headers:
- `Content-Disposition: attachment; filename="..."`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel)
- `Content-Type: application/pdf` (PDF)

---

## 2. Excel (.xlsx) Export Engine (`openpyxl`)

### Leading Zero Preservation (FS Numbers & Receipt References)
A critical requirement for Ethiopian commercial tax compliance:
- Ethiopian Fiscal Receipt numbers (`FS Number`) frequently contain leading zeros (e.g. `000451`, `000102`).
- Standard spreadsheet software automatically strips leading zeros or converts numbers to scientific notation if not explicitly instructed otherwise.

### Implementation in `backend/app/services/report_service.py`:
```python
# Force cell format to Text and write as string data type
cell.number_format = "@"
cell.data_type = "s"
cell.value = str(row_val)
```
This guarantees that when opened in Microsoft Excel, LibreOffice Calc, or Google Sheets, `000451` remains strictly `000451`.

### Styling & Layout:
- **Title Block:** Delgone Trading PLC header with Addis Ababa timezone notice and report generation timestamp.
- **Table Headers:** Delgone Navy fill (`#1E293B`), white bold text, thin borders.
- **Data Rows:** Left-aligned text, right-aligned monetary values with two decimal places (`#,##0.00 "ETB"`).
- **Auto-Fitted Columns:** Column widths dynamically scale based on maximum cell content length plus safety padding.
- **Summary / Total Rows:** Bold text with top and bottom double-accounting borders.

---

## 3. PDF Export Engine (`reportlab`)

### Visual Design & Branding:
- **Header:** Delgone Trading PLC company banner in Deep Navy (`#0F172A`) with Gold accents (`#D97706`).
- **Metadata:** Report period, generated timestamp, active filters, and currency (`ETB`).
- **Two-Pass Dynamic Page Numbering:** Custom `NumberedCanvas` calculates total page count on first pass and renders `"Page X of Y"` centered in the running footer on the second pass.
- **Table Layout:** Proportional column widths, automatic text wrapping via `Paragraph` flowables, alternating row shading (`#F8FAFC`).
- **Totals Section:** Emphasized background block with bold totals and transaction counts.

---

## 4. Frontend Universal Export Buttons

The Reports Hub (`frontend/src/pages/ReportsPage.tsx`) provides **Excel (.xlsx)** and **PDF Document** download buttons in the top header.

When clicked:
1. The frontend identifies the currently active tab (e.g. Daily Closeout, Cash Collections, Bank Collections, Credit Sales, Employee Activity, Customer Sales).
2. It requests `/api/reports/export/excel` or `/api/reports/export/pdf` with the active filters (`period`, `start_date`, `end_date`, `employee_id`, `customer_id`).
3. The response blob is received and triggered as an automatic browser file download, with filename extracted from the `Content-Disposition` header.
