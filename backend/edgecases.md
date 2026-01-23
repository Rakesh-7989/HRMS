# HRMS Backend - Edge Cases Documentation

> Module-wise documentation of edge cases, validation rules, and business logic constraints.

---

## 📋 Table of Contents
1. [Authentication Module](#authentication-module)
2. [Leave Module](#leave-module)
3. [Attendance Module](#attendance-module)
4. [Payroll - Expenses](#payroll---expenses)
5. [Payroll - Loans](#payroll---loans)
6. [Subscription Module](#subscription-module)
7. [Employee Module](#employee-module)

---

## Authentication Module

### Login (`auth.controller.js`)

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Invalid email format | Joi validation | ✅ Handled |
| Non-existent user | Generic "Invalid credentials" | ✅ Secure |
| Inactive account | Returns 403 "Account is inactive" | ✅ Handled |
| Expired portal access | Blocks login after `portal_access_until` | ✅ Handled |
| All sessions revoked | Returns 401 "Session revoked" | ✅ Handled |
| Case-sensitive email | Email stored as-is, comparison exact | ⚠️ Consider LOWER() |
| Empty password | Joi validation | ✅ Handled |

### Password Reset

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Non-existent email | Always returns success (security) | ✅ Secure |
| Expired token | Checked via `expires_at > now()` | ✅ Handled |
| Token reuse | Token deleted after use | ✅ Prevented |
| Password mismatch | Validated `newPassword === confirmPassword` | ✅ Handled |
| Weak password | ❌ No complexity check | 🔧 Add validation |

### Session Management

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Multiple active sessions | Allowed | ✅ By design |
| Logout without refresh token | Returns 400 | ✅ Handled |
| Revoke all other devices | Revokes all except current | ✅ Implemented |

---

## Leave Module

### Apply Leave (`leaveRequest.service.js`)

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Start date after end date | Throws "Start date cannot be after end date" | ✅ Handled |
| Inactive leave type | Checked via `is_active = true` | ✅ Handled |
| Min days notice not met | Throws if `diffDays < min_days_notice` | ✅ Handled |
| Missing required attachment | Throws if `requires_attachment && !attachment_url` | ✅ Handled |
| Overlapping leave requests | Checked via date overlap query | ✅ Handled |
| Leave on public holiday | Blocked unless half-day | ✅ Handled |
| Insufficient balance | Throws if `balance < daysCount` | ✅ Handled |
| No employee profile | Throws "Employee profile not linked" | ✅ Handled |
| Weekend leave application | Depends on `countWorkingDays` | ✅ Auto-excluded |
| Half-day leave balance | Handled as 0.5 days | ✅ Handled |
| Max consecutive days exceeded | Thrown if days > max_consecutive_days | ✅ Handled |

### Approve/Reject Leave

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Non-PENDING leave | WHERE clause `status = 'PENDING'` | ✅ Blocked |
| Unauthorized role | Only ADMIN/HR/MANAGER allowed | ✅ **Fixed** |
| Manager approving own leave | Blocked with direct check | ✅ **Fixed** |
| Manager approving non-direct report | Checked via `reports_to` | ✅ **Fixed** |
| Double approval | Returns "not found or already processed" | ✅ Prevented |

### Cancel Approved Leave

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Canceling past leave | Blocked if `start_date < today` | ✅ Handled |
| Non-approved leave | WHERE clause `status = 'APPROVED'` | ✅ Blocked |
| Balance restoration | Restores balance on cancel | ✅ Implemented |
| Non-owner cancellation | Checked via `employee_id` match | ✅ Handled |

---

## Attendance Module

### Clock In (`attendance.service.js`)

| Edge Case | Handling | Status |
|-----------|----------|--------|
| No employee profile | Throws "employee profile not complete" | ✅ Handled |
| Already clocked in | Throws "Already clocked in at [time]" | ✅ Blocked |
| On approved full-day leave | Throws "on approved leave" | ✅ Blocked |
| On approved half-day leave | Allowed, sets status = 'HALF_DAY' | ✅ Handled |
| Missing IP address | Defaults to "Unknown" | ✅ Graceful |

### Clock Out

| Edge Case | Handling | Status |
|-----------|----------|--------|
| No clock-in record | Throws "No check-in found" | ✅ Handled |
| Already clocked out | Throws "Already clocked out" | ✅ Blocked |
| Working hours < 10 | Sets status to 'INCOMPLETE_HOURS' | ✅ Flagged |
| Clock out after midnight | May cause date boundary issues | ⚠️ Edge case |

### Pending Checkouts

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Auto-approve after 24h | Sets to PRESENT automatically | ✅ Implemented |
| Employee confirming other's checkout | Blocked by ownership check | ✅ Handled |
| Non-PENDING_CHECKOUT confirmation | Returns "not pending confirmation" | ✅ Handled |

---

## Payroll - Expenses

### Create Expense (`expenses.service.js`)

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Negative amount | Throws "Amount must be positive" | ✅ **Fixed** |
| Zero amount | Blocked | ✅ **Fixed** |
| Future expense date | Throws "cannot be in the future" | ✅ **Fixed** |
| Missing category | Database constraint error | ✅ DB-level |
| Invalid category ID | Foreign key constraint | ✅ DB-level |

### Approve Expense

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Invalid status value | Only APPROVED/REJECTED allowed | ✅ **Fixed** |
| Non-PENDING expense | WHERE clause `status = 'PENDING'` | ✅ **Fixed** |
| Re-approving approved expense | Returns "already processed" | ✅ **Fixed** |
| Approving deleted expense | `is_deleted` not checked | ⚠️ Add check |

---

## Payroll - Loans

### Create Loan (`loans.service.js`)

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Amount > max_amount | Throws "exceeds allowed limit" | ✅ Handled |
| Tenure > max_tenure_months | Throws "tenure exceeds limit" | ✅ Handled |
| Salary advance with interest | Throws "must have zero interest" | ✅ Handled |
| Salary advance > 3 months | Throws "max 3 months" | ✅ Handled |
| Non-existent loan type | Throws "Invalid loan type" | ✅ Handled |
| Duplicate loan type name | ConflictError thrown | ✅ Handled |
| Invalid employee_id | BadRequestError thrown | ✅ Handled |

### Approve/Reject Loan

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Invalid status value | Only APPROVED/REJECTED allowed | ✅ **Fixed** |
| Non-PENDING loan | WHERE clause `status = 'PENDING'` | ✅ **Fixed** |
| Re-approving approved loan | Returns "already processed" | ✅ **Fixed** |
| Installment creation twice | Checked via EXISTS query | ✅ Prevented |

### EMI Processing

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Negative EMI payment | ❌ Not validated | 🔧 Add check |
| Outstanding goes negative | Status set to CLOSED when <= 0 | ✅ Handled |
| Loan closure with balance > 0 | WHERE `outstanding_amount = 0` | ✅ Prevented |

---

## Subscription Module

### Subscription Status

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Trial expiry | Checked via `trial_ends_at` | ✅ Handled |
| Employee limit exceeded | Middleware check | ✅ Enforced |
| Feature access after expiry | Middleware blocks | ✅ Handled |
| Plan downgrade with excess employees | ⚠️ Not blocked | 🔧 Add logic |

---

## Employee Module

### Employee Management

| Edge Case | Handling | Status |
|-----------|----------|--------|
| Duplicate employee_id | UNIQUE constraint | ✅ DB-level |
| Circular reports_to | ❌ Not validated | 🔧 Add check |
| Delete with active loans | ❌ Not blocked | 🔧 Add constraint |
| Terminate with pending leaves | ❌ Leaves not auto-cancelled | 🔧 Add logic |
| Email change | Updates user table | ✅ Synced |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Handled | Already implemented and working |
| ✅ **Fixed** | Fixed in this security update |
| ⚠️ Edge case | Potential issue, low priority |
| 🔧 Add check | Needs implementation |
| ❌ Not validated | Missing validation |

---

## Security Fixes Applied (v1.0)

1. **SQL Injection Fix** - `setRLSContext.js` now uses parameterized queries
2. **Authorization Checks** - Leave approve/reject now validates roles and manager relationships
3. **Status Validation** - Expense and loan approval now validates allowed statuses
4. **Pending Status Check** - Cannot re-approve already processed records
5. **Amount Validation** - Expense creation validates positive amounts
6. **Future Date Check** - Expense dates cannot be in the future

---

