# Delgone Digital Sales Ledger — Customer Management Specification

**Phase:** Phase 4  
**Target Organization:** Delgone Trading PLC (Addis Ababa, Ethiopia)  
**Status:** Implemented & Verified  

---

## 1. Overview & Purpose

Delgone Trading PLC serves a diverse clientele ranging from walk-in cash retail customers purchasing offset printing supplies (inks, plates, paper stock) to large recurring corporate printing houses and graphic design studios operating on trade credit.

The Customer Management module provides a structured, audit-logged directory for client contact management, intelligent duplicate detection, account lifecycle toggling (active/inactive), and seamless integration with the sales counter terminal.

---

## 2. Customer Data Model & Fields

Each customer account records the following schema attributes:

| Field | Type | Description | Mandatory |
| :--- | :--- | :--- | :--- |
| `id` | UUID (String) | Unique primary key identifier | Auto-generated |
| `name` | String(255) | Customer contact or proprietor full name | Yes |
| `company_name` | String(255) | Business, studio, or corporate printing firm trade name | Optional |
| `phone` | String(50) | Primary contact phone number (Ethiopian mobile or landline) | Optional |
| `alt_phone` | String(50) | Secondary contact phone number | Optional |
| `email` | String(255) | Billing or notification email address | Optional |
| `address` | Text | Physical location (Sub-city, Woreda, landmarks in Addis Ababa) | Optional |
| `notes` | Text | Counter notes, credit arrangements, special instructions | Optional |
| `is_active` | Boolean | Account operational status (True = Active, False = Inactive) | Default: True |
| `created_at` | DateTime (UTC) | Registration timestamp | Auto-generated |
| `updated_at` | DateTime (UTC) | Last modified timestamp | Auto-generated |

---

## 3. Duplicate Detection & Warning Workflow

In high-pace commercial trading environments, duplicate accounts frequently arise from typos or slight name variations (e.g., entering "Abebe Bekele" and "Abebe B."). Conversely, two distinct sole proprietors may legitimately share identical personal names in Ethiopia.

### Detection Criteria
The system queries existing records before committing a new customer:
1. **Phone Number Collision:** Exact match on primary or secondary phone.
2. **Email Collision:** Case-insensitive match on email address.
3. **Name + Company Collision:** Case-insensitive match on both full name and business name.

### Prevention without Auto-Merging
- The system **does not** automatically merge customer records, as combining accounts with outstanding financial liabilities could cause legal disputes.
- When duplicates are detected, the API returns HTTP `409 Conflict` (or `GET /api/customers/check-duplicate`) with a list of matching records.
- Counter staff are presented with an amber warning banner displaying matching names, companies, and phones.
- To prevent accidental double registration while still permitting valid namesakes, creation requires checking:
  > *"Confirm this is a distinct customer and not a duplicate."*
- Submitting with `confirm_duplicate: true` commits the record and logs the event in the audit trail.

---

## 4. Customer Account Lifecycle (Active vs. Inactive)

### Deactivation Rules
- When a customer account is deactivated (`is_active = False`):
  - The customer is immediately excluded from the New Sale typeahead search.
  - Attempting to record a new sale against an inactive customer via the API is blocked with HTTP `400 Bad Request` (*"Cannot record sale for inactive customer"*).
  - All historical sales transactions, fiscal receipt numbers, payments, and ledger balances remain **100% intact**.
  - Inactive accounts remain visible in the Customer Directory under the "Inactive" filter for audit and debt collection purposes.
- Any deactivation or reactivation requires an optional reason and is recorded in `audit_logs` with the actor's user ID, IP address, and timestamp.

---

## 5. Counter Terminal Integration

- During counter sales (`/sales/new`), staff can select from active customers or choose the **Walk-in Customer** option for immediate over-the-counter cash transactions.
- A quick-creation modal is available directly within the sale workflow, allowing cashiers to register new customers without losing their current line-item cart.
- Customer profiles can also be launched directly from the Customer Profile page (`"New Sale for Client"`), which pre-populates the customer into the transaction terminal.
