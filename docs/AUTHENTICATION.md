# Delgone Digital Sales Ledger — Authentication & Session Architecture

**Document Version:** 2.0.0  
**Phase:** Phase 2 Implementation  
**Target Organization:** Delgone Trading PLC  
**Author:** Lead Full-Stack Software Architect  

---

## 1. Authentication Strategy Decision & Rationale

### Strategy Selection: Secure HttpOnly SameSite Cookies + Bearer Header Fallback

For the Delgone Digital Sales Ledger, authentication is implemented using signed **JSON Web Tokens (JWT)** delivered via **`HttpOnly` `SameSite=Lax` browser cookies** (`delgone_token`), with dual support for `Authorization: Bearer <token>` request headers.

```
+-------------------------------------------------------------------------------+
|                               LOGIN FLOW                                      |
|                                                                               |
|  Client (Browser / PWA)                   FastAPI Backend Server             |
|          |                                         |                          |
|          | --- POST /api/auth/login -------------> |                          |
|          |     { username, password }              | [1] Check Rate Limiter   |
|          |                                         | [2] Lookup User          |
|          |                                         | [3] Verify Bcrypt Hash   |
|          |                                         | [4] Record Audit Log     |
|          |                                         | [5] Generate Signed JWT  |
|          | <--- Set-Cookie: delgone_token=<jwt> -- |                          |
|          |      HttpOnly; SameSite=Lax; Path=/     |                          |
|          |      Response: { user, token }          |                          |
+-------------------------------------------------------------------------------+
```

### Why Long-Lived Tokens in `localStorage` Are Strictly Forbidden
1. **Cross-Site Scripting (XSS) Vulnerability:** JavaScript running in the browser (including third-party scripts, malicious plugins, or compromised dependencies) has unrestricted read access to `window.localStorage`. Storing authentication tokens in `localStorage` allows session hijacking.
2. **HttpOnly Cookie Protection:** HttpOnly cookies are completely inaccessible to JavaScript (`document.cookie`), neutralizing token theft via XSS.
3. **SameSite=Lax CSRF Defense:** Modern browsers strictly restrict sending `SameSite=Lax` cookies on cross-origin mutation requests (POST/PUT/DELETE), protecting counter transactions from Cross-Site Request Forgery (CSRF).
4. **Offline PWA Readiness:** When service workers intercept requests in future phases, credentialed requests (`withCredentials: true`) seamlessly pass the session cookie without requiring client script access.

---

## 2. Password Security & Cryptographic Standards

- **Hashing Algorithm:** `bcrypt` with work factor / cost parameter `rounds = 12`.
- **Salting:** Unique cryptographic salt automatically generated per password (`bcrypt.gensalt(12)`).
- **Plaintext Elimination:** Plaintext passwords are never logged, never stored, and never returned in API payloads or audit logs.
- **Password Strength Rules:**
  - Minimum length: 8 characters.
  - Alphanumeric requirement: Must contain at least one letter and at least one digit.

---

## 3. Session Expiration & Brute-Force Rate Limiting

- **Token Expiration:** Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 480 minutes / 8 hours), matching Delgone's physical daily counter sales shift.
- **Brute-Force Protection (`LoginRateLimiter`):**
  - Sliding time window: 15 minutes (900 seconds).
  - Maximum failed attempts: 5 attempts per `IP + username` identifier.
  - Action on threshold exceeded: Returns HTTP 429 Too Many Requests with remaining lockout minutes.
  - Action on success: Resets attempt counter immediately.

---

## 4. API Endpoints Specification

### 4.1 `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "username": "abebe_k",
    "password": "SecurePassword123!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets `delgone_token` cookie. Returns authenticated user profile and session token.
  - `401 Unauthorized`: `"Incorrect username or password"`.
  - `403 Forbidden`: `"Your account is deactivated. Please contact an administrator."`.
  - `429 Too Many Requests`: `"Too many failed login attempts. Please try again in X minutes."`.

### 4.2 `POST /api/auth/logout`
- **Behavior:** Instructs the browser to delete the `delgone_token` cookie (`Max-Age=0`), removes any cached session state, and creates an audit log entry.
- **Response:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### 4.3 `GET /api/auth/me`
- **Security:** Requires valid cookie or Bearer token.
- **Response:**
  ```json
  {
    "id": "e306ce59-fc5e-4bb5-a3a8-44438df377e1",
    "username": "abebe_k",
    "full_name": "Abebe Kebede",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-11-16T08:30:00Z",
    "updated_at": "2026-11-16T08:30:00Z",
    "last_login_at": "2026-11-16T08:45:00Z",
    "password_changed_at": null
  }
  ```

---

## 5. First Administrator Bootstrap Procedure

Initial administrative credentials must never be committed to git or hardcoded into application source files.

To initialize the first administrator:
```bash
# Interactive command line prompt:
python backend/scripts/bootstrap_admin.py

# Or non-interactive CLI flags:
python backend/scripts/bootstrap_admin.py \
  --username admin \
  --full-name "Managing Director" \
  --password "YourSecurePassword123!"

# Or via environment variables:
INITIAL_ADMIN_USERNAME=admin \
INITIAL_ADMIN_FULL_NAME="Managing Director" \
INITIAL_ADMIN_PASSWORD="YourSecurePassword123!" \
python backend/scripts/bootstrap_admin.py
```
