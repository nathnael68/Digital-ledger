# Delgone Digital Sales Ledger — Open Decisions & Clarifications Log

**Document Version:** 1.0.0  
**Target Organization:** Delgone Trading PLC  
**Status:** Open for Stakeholder Review  

---

## Purpose
In accordance with system design principles, assumptions regarding business policies, legal compliance, and store operations are not silently hardcoded. This document catalogs key decisions requiring stakeholder guidance before commencing Phase 2 and subsequent phases.

---

## 1. Open Business & Operational Decisions

| # | Topic | Description & Options | Impact | Stakeholder Recommendation Needed |
| :- | :--- | :--- | :--- | :--- |
| **OD-01** | **Paper Receipt Numbering & Uniqueness** | Delgone employees record sales on paper receipt books. Are these numbers strictly unique across the business, or do different receipt books have prefix letters (e.g., `Book A - 00123` vs `Book B - 00123`)?<br>**Option A:** Require strict global uniqueness on `paper_receipt_number`.<br>**Option B:** Allow duplicate receipt numbers if books share sequences, or require a `Book Series` prefix. | Sales validation & database constraint | Clarify receipt book numbering format |
| **OD-02** | **Ethiopian Tax Compliance (VAT vs. TOT)** | In Ethiopian commercial law, businesses are either VAT-registered (15% standard rate) or subject to Turnover Tax (TOT: 2% on goods / 10% on services).<br>**Option A:** Flat gross pricing (tax included in unit price, no separate tax breakdown).<br>**Option B:** Configurable tax calculation (subtotal + 15% VAT - discount = grand total). | Pricing math & receipt rendering | Confirm Delgone's tax registration category |
| **OD-03** | **Customer Credit Limits & Approval** | Can a sales employee issue credit sales to any customer without restriction, or should credit have controls?<br>**Option A:** Unrestricted credit sale creation by sales employees.<br>**Option B:** Maximum credit limit per customer; exceeding requires Admin override. | Risk management & credit controls | Confirm credit policy |
| **OD-04** | **Bank Accounts & Digital Wallet Registry** | Delgone receives payments via bank transfers (CBE, Awash, Dashen) and mobile money (Telebirr, CBE Birr).<br>**Option A:** Free-text string for payment method and reference.<br>**Option B:** Pre-configured list of Delgone company bank accounts where employees select the destination account. | Bank reconciliation accuracy | Provide list of active bank/wallet accounts |
| **OD-05** | **Cash Drawer & Shift Reconciliation** | Should the system track cash drawer shifts (opening cash float + cash sales - cash drop/remittance = expected drawer total)?<br>**Option A:** Transaction-level recording only.<br>**Option B:** Full shift open/close reconciliation with end-of-day discrepancy reporting. | Shift management scope | Confirm if cash drawer counting is desired |
| **OD-06** | **Multi-Branch / Multi-Counter Architecture** | Delgone is currently operating a centralized location. Are there plans for multiple retail outlets or distinct sales counters in Addis Ababa?<br>**Option A:** Single location structure (default for Phase 1).<br>**Option B:** Branch/register tagging in sale numbers (e.g. `DLG-B1-XXXX`). | Long-term data schema | Confirm future store expansion plans |
| **OD-07** | **Return & Exchange Policy** | How are merchandise returns and order exchanges handled?<br>**Option A:** Void transaction with manager reason (full reversal).<br>**Option B:** Credit note issuance allowing partial returns of specific line items. | Ledger complexity | Confirm return frequency and rules |

---

## 2. Review & Sign-Off Process
Stakeholders from Delgone Trading PLC (Management & Accounting) should review these items. Any agreed resolution will be transitioned into `docs/REQUIREMENTS.md` with explicit functional requirements.
