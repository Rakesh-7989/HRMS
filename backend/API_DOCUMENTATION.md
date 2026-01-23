# HRMS API Documentation & Edge Case Analysis

This document provides a comprehensive overview of the HRMS backend API endpoints, including covered edge cases and critical gaps identified from a senior developer perspective.

---

## 🔐 1. Authentication Module (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/login` | Authenticates user and returns JWT + Refresh Token. |
| POST | `/refresh` | Generates a new Access Token using a valid Refresh Token. |
| POST | `/forgot-password` | Sends a password reset email with a 32-byte hex token. |
| POST | `/reset-password` | Resets password using a valid, non-expired reset token. |
| POST | `/change-password` | Updates password for a logged-in user. |
| POST | `/logout` | Revokes the provided Refresh Token. |
| POST | `/logout-all` | Revokes all sessions except the current one. |
| GET | `/sessions` | Lists all active sessions for the user. |

### ✅ Covered Edge Cases
- Inactive account detection.
- Refresh token expiration and revocation.
- Password mismatch on reset.
- Token expiry for password resets (15 min).

### 🚨 Critical Gaps (Senior Level)
- **Rate Limiting**: No protection against brute-force login attempts or forgot-password spam.
- **Session Bindings**: Refresh tokens are not bound to IP or User-Agent, increasing risk of replay attacks if a token is stolen.
- **Reset Token Invalidation**: Requesting a new reset token does not invalidate previously issued tokens for the same user.

---

## 🏢 2. Tenant & Super Admin (`/api/tenant`, `/api/super-admin`)

| Method | Endpoint | Description |
| POST | `/tenant/register` | Registers a new organization and creates first Admin user.|
| GET | `/super-admin/tenants` | Lists all tenants (Super Admin only). |
| PATCH | `/super-admin/tenants/:id/activate` | Activates a tenant. |

### ✅ Covered Edge Cases
- Duplicate check for domain, email, and phone during registration.
- Transactional integrity (Tenant + User + Subscription).

### 🚨 Critical Gaps (Senior Level)
- **Email Delivery Failure**: If the welcome email fails, the tenant admin is locked out with no way to retrieve their auto-generated temporary password.
- **Domain Sanity**: No validation for reserved subdomains (e.g., `api`, `admin`, `www`).

---

## 👥 3. Users & Employees (`/api/users`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/` | Creates a new employee/user record. |
| GET | `/` | Lists employees for the tenant. |
| PUT | `/:id/role` | Changes a user's role (Manager/Admin/HR). |
| PUT | `/:id/manager` | Assigns a reporting manager. |

### ✅ Covered Edge Cases
- Role-based creation restrictions (HR cannot create Admins).
- Employee limit checks based on subscription plan.

### 🚨 Critical Gaps (Senior Level)
- **Circular Reporting**: No check to prevent "Manager A reports to Manager B, and Manager B reports to Manager A".
- **Admin Lockout**: No check to prevent the last Admin from deactivating their own account or changing their role.
- **Audit Trails**: Critical changes like `role` or `email` are not explicitly logged to the audit trail in the current implementation.

---

## 🕒 4. Attendance & Leave (`/api/attendance`, `/api/leave`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/attendance/clock-in` | Clocks in for the day. |
| POST | `/attendance/clock-out` | Clocks out and calculates working hours. |
| POST | `/leave/apply` | Applies for leave (Full/Half day). |
| POST | `/leave/:id/approve` | Approves leave request. |

### ✅ Covered Edge Cases
- Double clock-in prevention.
- Clock-in block if on approved full-day leave.
- Overlapping leave application prevention.

### 🚨 Critical Gaps (Senior Level)
- **Concurrency**: `clock-in` logic has a "Check then Insert" race condition. Two rapid clicks could create duplicate records.
- **Leave Balance**: The system accepts leave applications without checking against a remaining leave balance.
- **Self-Approval**: Managers can potentially approve their own leave or attendance records if they hit the endpoint directly.

---

## 💰 5. Payroll & Expenses (`/api/payroll`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/expenses/createexpense` | Submits an expense claim. |
| PATCH | `/expenses/:id/approve` | Approves/Rejects an expense. |
| POST | `/loans/loantype` | Defines a new loan type. |

### ✅ Covered Edge Cases
- Basic role guards for approvers.
- Soft deletion of expense records.

### 🚨 Critical Gaps (Senior Level)
- **Fraud Risk**: No duplicate detection for expense amounts/dates or receipt/file hashes.
- **Self-Approval Loophole**: The `requireExpenseApprover` middleware checks roles but does not verify that the approver is different from the claimant.
- **Placeholder Overuse**: Many `/api/payroll` endpoints are simple placeholders returning empty arrays, which may break frontend expectations.

---

## 📊 6. Subscription & Dashboards (`/api/subscriptions`, `/api/dashboards`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/subscriptions/my-subscription` | Current plan details (Admin only). |
| GET | `/subscriptions/usage` | Current usage vs plan limits (Admin only). |
| POST | `/subscriptions/upgrade` | Upgrades current plan (Admin only). |
| POST | `/subscriptions/cancel` | Cancels subscription (Admin only). |
| GET | `/subscriptions/plans` | Lists available plans (Public). |

### ✅ Covered Edge Cases
- Plan-based feature access(enforced in middleware).

### 🚨 Critical Gaps (Senior Level)
- **Downgrade Logic**: No automated logic to handle what happens to "extra" employees when a plan is downgraded to a lower limit.
