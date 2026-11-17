# Delgone Digital Sales Ledger — Advanced Sales Ledger Specification

**Phase:** Phase 4  
**Target Organization:** Delgone Trading PLC (Addis Ababa, Ethiopia)  
**Status:** Implemented & Verified  

---

## 1. Overview & Purpose

The Advanced Sales Ledger (`/sales`) serves as the central digital record book for Delgone Trading PLC. It replaces physical handwritten sales registers with a multi-criteria searchable, filterable, and sortable audit view.

It is designed to handle thousands of historical sales transactions with server-side pagination, fast indexed searching, and full alignment with Ethiopian customs fiscal printer (FS) conventions.

---

## 2. Multi-Identifier Search Capabilities

Counter employees and auditors can locate transactions quickly by typing into a unified search bar. The search engine matches across:

1. **Sale Number:** System-generated sequential code (e.g., `DL-2026-0001`).
2. **Customs FS Number:** Fiscal cash register receipt reference with **leading zeros preserved** (e.g., `FS-00451` or `00892`).
3. **Customer Name:** Primary contact person or proprietor.
4. **Customer Company / Trade Name:** Business or printing firm name.
5. **Customer Phone Numbers:** Primary and alternative phone numbers.
6. **Paper Receipt Number:** Physical counter voucher serial reference (e.g., `PR-1022`).
7. **Product Description:** Descriptions and line item product names (e.g., `Offset Ink Cyan`).

---

## 3. Multi-Field Filter Bar

The ledger supports combined multi-dimensional filtering:

| Filter | Options | Description |
| :--- | :--- | :--- |
| **Payment Status** | All, Paid, Partial, Credit, Voided | Filters transactions based on balance settlement state |
| **Payment Method** | All, Cash, Bank Transfer, Telebirr, CBE Birr | Filters by payment instrument recorded |
| **Transaction Status** | Active & Voided, Active Only, Voided Only | Allows isolating active transactions or viewing void audits |
| **Balance Filter** | All, Has Balance Due (> 0), Settled (0.00 ETB) | Instantly identifies unpaid credit and partial transactions |
| **Date Range** | From Date, To Date | Filters sales within an Addis Ababa local date bracket |

---

## 4. Sorting & Deep Linking (URL State Synchronization)

- **Column Sorting:** Users can click table headers or select a sorting dropdown to sort by:
  - `sale_date` (default: newest first)
  - `sale_number`
  - `fs_number`
  - `customer_name`
  - `grand_total`
  - `outstanding_balance`
  - Toggle between `ASC` and `DESC`
- **URL Parameter Synchronization:** Every search query, filter option, sort column, and page number is synchronized directly into the browser URL via `useSearchParams`. Staff members can bookmark specific ledger views or share direct links with managers or auditors.
