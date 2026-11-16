# Delgone Digital Sales Ledger — Role-Based Access Control (RBAC) Specification

**Document Version:** 2.0.0  
**Phase:** Phase 2 Implementation  
**Target Organization:** Delgone Trading PLC  

---

## 1. System Role Hierarchy

The Delgone Digital Sales Ledger defines two principal operational roles:

```
                  +-------------------------+
                  |      Administrator      |
                  | (Owner, Lead Accountant)|
                  +-------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+-------------------------+             +-------------------------+
|   Employee Management   |             |   All Sales Operations  |
| - Create Employees      |             | - View Full Dashboard   |
| - Edit Roles            |             | - Access All Reports    |
| - Activate/Deactivate   |             | - Inspect Audit Logs    |
| - Reset Passwords       |             +-------------------------+
+-------------------------+                          |
                                                     v
                                        +-------------------------+
                                        |     Sales Employee      |
                                        | (Counter Cashier / Rep) |
                                        +-------------------------+
                                                     |
                                        +------------+------------+
                                        |                         |
                                        v                         v
                           +-------------------------+  +-------------------+
                           | Daily Counter Dashboard |  | Personal Profile  |
                           | Sales Recording (Ph. 3) |  | Session Logout   |
                           +-------------------------+  +-------------------+
```

---

## 2. Granular Permissions Matrix

| Capability / Resource | Administrator | Sales Employee | Backend Security Guard |
| :--- | :---: | :---: | :--- |
| **Login & Session Authentication** | Yes | Yes | `POST /api/auth/login` |
| **Inspect Own Profile (`/api/auth/me`)** | Yes | Yes | `get_current_user` |
| **Logout & Clear Session** | Yes | Yes | `POST /api/auth/logout` |
| **View Real-Time Dashboard** | Yes | Yes | `get_current_user` |
| **View Employee Directory** | Yes | **Denied (403)** | `get_current_active_admin` |
| **Create New Employee Account** | Yes | **Denied (403)** | `get_current_active_admin` |
| **Update Employee Details** | Yes | **Denied (403)** | `get_current_active_admin` |
| **Activate / Deactivate Accounts** | Yes | **Denied (403)** | `get_current_active_admin` |
| **Reset Employee Passwords** | Yes | **Denied (403)** | `get_current_active_admin` |
| **Inspect System Audit Logs** | Yes | **Denied (403)** | `get_current_active_admin` |

---

## 3. Defense-in-Depth Enforcement Architecture

Permissions are enforced at two independent architectural boundaries:

### Boundary 1: Backend API Authorization (Strict)
Permissions are **never** trusted from client-side state. Every privileged endpoint incorporates FastAPI's dependency injection:
```python
@router.post("/users", response_model=UserResponse)
def create_employee(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),  # Raises HTTP 403 if role != 'admin'
):
    ...
```
If a non-administrator client attempts to forge a request to `/api/users`, the backend immediately terminates the request with HTTP `403 Forbidden` and message `"Administrative privileges required to access this resource"`.

### Boundary 2: Frontend Route & UI Guards
1. **Conditional Navigation:** The "Employees" sidebar navigation item is completely hidden from non-admin users.
2. **Component Route Guard:** Direct navigation (or URL bookmarking) to `/employees` triggers `<ProtectedRoute requireAdmin={true}>`, displaying an "Access Restricted" alert and redirecting to the main dashboard.

---

## 4. Administrative Account Safeguards

To prevent catastrophic administrative lockout:
1. **Self-Deactivation Guard:** An administrator cannot deactivate their own currently active account (`PATCH /api/users/{id}/status`).
2. **Sole Administrator Demotion Guard:** An administrator cannot change their own role away from `"admin"` if they are the only remaining active administrator on the system (`PUT /api/users/{id}`).
3. **Audit Immutability:** Any administrative changes to roles, statuses, or passwords write an immediate entry to the `AuditLog` table capturing actor, target, timestamp, and sanitized before/after values.
