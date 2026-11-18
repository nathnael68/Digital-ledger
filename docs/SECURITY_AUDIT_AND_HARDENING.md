# Security Audit & Hardening Documentation

**Project:** Delgone Digital Sales Ledger  
**Organization:** Delgone Trading PLC — Addis Ababa, Ethiopia  
**Phase:** Phase 6 — Production Readiness, PWA, Deployment & Security  

---

## 1. Executive Summary

This document details the security posture, defensive controls, and architectural hardening implemented in the Delgone Digital Sales Ledger application. The security architecture adheres to the principle of least privilege, defense-in-depth, strict financial immutability, and protection against OWASP Top 10 vulnerabilities.

---

## 2. Threat Model & Key Assets

| Asset | Risk Category | Protective Mechanism |
| :--- | :--- | :--- |
| **User Passwords** | Credential Harvesting | Bcrypt hashing with salted work factor; never stored or logged in plaintext. |
| **Authentication Cookies** | Session Hijacking / XSS Theft | `HttpOnly`, `SameSite=Lax`, `Secure` (in production), 8-hour expiration. |
| **Financial Records (Sales/Payments)** | Unauthorized Deletion / Tampering | Immutability architecture: hard deletion is blocked at the ORM/DB level; foreign keys use `RESTRICT`; soft-voiding requires justification and administrative role. |
| **Fiscal Sequences (FS Numbers)** | Duplicate Numbers / Collisions | Atomic sequence generator locked via table-level locks (`SELECT FOR UPDATE`) within transaction blocks. |
| **Customer Credit Balances** | Fraudulent ledger alteration | Computed point-in-time from valid transactions and historical payment allocations using exact `Numeric(12,2)` precision. |

---

## 3. Implemented Security Controls

### A. Authentication & Password Security
- **Bcrypt Password Hashing:** Uses `passlib` with standard bcrypt adaptive hashing. Passwords are never stored in plaintext or logged.
- **Session Tokens:** Stateless JWT with `HS256`, containing only user identifier, role, and expiration timestamp (`exp`).
- **Cookie-Based Delivery:**
  - `httponly=True`: Prevents client-side JavaScript access via XSS.
  - `samesite="lax"`: Blocks cross-site request forgery in top-level cross-origin navigations.
  - `secure=True`: Enforced in production environments so cookies are transmitted exclusively over TLS.
- **Brute-Force Rate Limiting:**
  - Backend in-memory rate limiter tracks consecutive failed logins by IP and username.
  - Exceeding 5 attempts results in an automatic 15-minute cooldown (`HTTP 429 Too Many Requests`).
  - Production Nginx proxy adds network-tier rate limiting (`limit_req_zone` 5 requests per minute with burst of 3).

### B. Authorization & Role-Based Access Control (RBAC)
- **Role Verification:** Fast and strict role checking via FastAPI dependency injection (`get_current_user`, `require_admin`).
- **Deactivated Accounts:** Instantly denied login and blocked from existing tokens on the next API call (`if not user.is_active: raise 403`).
- **Privilege Separation:**
  - Sales Employees (`sales_employee`): Can record sales, process payments, register customers, and view personal transactions.
  - Administrators (`admin`): Can manage user accounts, change system settings, soft-void sales, view audit logs, and access management reporting.

### C. Injection & Data Integrity Defenses
- **SQL Injection Prevention:** 100% of database interactions utilize SQLAlchemy 2.0 ORM with parameterized query bindings. Zero raw string interpolation is permitted.
- **Cross-Site Scripting (XSS):**
  - React JSX handles automatic context-aware HTML entity escaping for all dynamic strings.
  - Strict HTTP response headers prevent script execution in unexpected contexts.
- **Input Validation:** Strict Pydantic v2 validation models for all incoming request bodies, query parameters, and path variables.

### D. Network & HTTP Hardening
- **Security Headers:** The application injects comprehensive HTTP security headers on all responses via FastAPI middleware and Nginx:
  ```http
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  ```
- **CORS Whitelisting:** Strictly restricted to designated production origins (`https://ledger.delgone.com`). Wildcard origins (`*`) are disallowed when `allow_credentials=True`.
- **Database Isolation:** PostgreSQL container is placed on an internal Docker network with **no published ports** to the host or internet (`internal: true`).

### E. Audit Logging & Compliance
- **Comprehensive Audit Trail:** All critical operations are immutably logged into the `audit_logs` table:
  - User logins (success and failures with IP context).
  - Password changes.
  - Sale creation, checkout, and soft-voiding with mandatory rationale.
  - Payment collections.
  - Customer profile modifications.
- **Sensitive Data Exclusion:** Password hashes, raw credentials, and sensitive headers are explicitly excluded from application logs.

---

## 4. Production Security Checklist

Prior to launching in a live production environment:

- [x] Change default `JWT_SECRET_KEY` to a 64-character random hex string.
- [x] Generate unique, high-entropy PostgreSQL passwords.
- [x] Ensure `.env.production` file permissions are set to `chmod 600`.
- [x] Verify PostgreSQL port `5432` is not open in firewall (`ufw status`).
- [x] Verify SSL certificate achieves Grade A on SSL Labs.
- [x] Confirm default development admin credentials (`DelgoneAdmin2026!`) are rotated.
- [x] Verify automated daily backups are running and verified via test restoration.
