# HRMS SaaS — Complete Production Deployment Guide

**Last Updated:** 2026-02-20

---

## Root Cause Analysis: Sidebar & Route Issues

### Problem
- **Admin sidebar missing** in production
- **Superadmin only sees open routes** (Tenants, Plans, Coupons, Activity, Roles)

### Why This Happens

The sidebar visibility is controlled by **RBAC (Role-Based Access Control)** permissions. Each sidebar item requires specific permissions:

```
Sidebar → checks user.permissions → loaded from DB tables:
  user_roles → role_permissions → permissions
```

**If the RBAC migration hasn't run in production**, the `permissions`, `role_permissions`, and `user_roles` tables are empty. This means:

1. **Admin users** get an empty `permissions[]` array → no sidebar items shown
2. **Super Admin** appears to work partially because `PermissionContext.tsx` auto-grants all permission checks for `SUPER_ADMIN` role, BUT `Sidebar.tsx` has a strict whitelist that limits SUPER_ADMIN to only: `/dashboard/system`, `/tenants`, `/plans`, `/coupons`, `/activity`, `/roles`

### The Fix

Run the migration runner in production, which executes `20260215_rbac_comprehensive.sql` (and all other pending migrations). This migration:
- Creates `permissions`, `role_permissions`, `user_roles` tables
- Seeds 50+ permissions across all categories
- Creates system roles (SUPER_ADMIN, ADMIN, EMPLOYEE) with proper permission assignments
- Clones roles per-tenant with inherited permissions
- Backfills `user_roles` for all existing users

---

## Complete Deployment Steps

### Prerequisites

- Node.js 18+ installed on server
- PostgreSQL 14+ database (local or hosted like Render, Supabase, etc.)
- Git access to the repository

---

### Step 1: Clone & Install Dependencies

```bash
git clone <your-repo-url> HRMS
cd HRMS

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

#### Backend (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your production values:

```env
# Core
NODE_ENV=production
PORT=5000

# Database (use your production DB URL)
DATABASE_URL=postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>

# JWT (use strong, random secrets!)
JWT_ACCESS_SECRET=<generate-random-64-char-string>
JWT_REFRESH_SECRET=<generate-random-64-char-string>
JWT_EXPIRES_IN=1h

# Security
BCRYPT_SALT_ROUNDS=10
FRONTEND_URL=https://your-frontend-domain.com

# Email (SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<your-smtp-email>
SMTP_PASS=<your-smtp-password>
EMAIL_FROM=noreply.hrms@WellZo.com
EMAIL_FROM_NAME=HR WellZo

# Payment (Cashfree)
CASHFREE_APP_ID=<your-cashfree-app-id>
CASHFREE_SECRET_KEY=<your-cashfree-secret-key>
CASHFREE_ENVIRONMENT=PRODUCTION
```

#### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_CASHFREE_ENVIRONMENT=production
```

> **Important:** The `VITE_API_BASE_URL` must point to your deployed backend API, not `localhost`.

---

### Step 3: Database Setup (First-Time Only)

If this is a **fresh database**, run the base schema first:

```bash
# Connect to your PostgreSQL and run:
psql -h <HOST> -U <USER> -d <DB_NAME> -f backend/src/database/schema.sql
```

> The `schema.sql` file creates all base tables including `users`, `employees`, `tenants`, `roles`, etc.

**Required PostgreSQL extensions** (run in psql if not already enabled):
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

### Step 4: Run ALL Database Migrations ⚠️ CRITICAL

This is the **most important step** — it creates the RBAC system that powers the sidebar and permissions.

```bash
cd backend
node src/database/run_all_migrations.js
```

**What this does:**
- Creates a `schema_migrations` tracking table
- Runs all `.sql` files in `src/database/migrations/` in alphabetical order
- Skips already-executed migrations (idempotent)
- Key migrations include:
  - `20260215_rbac_comprehensive.sql` — **Creates RBAC tables, seeds permissions, roles, and backfills user_roles**
  - `20260218_system_refinements_consolidated.sql` — Dashboard permissions and org hierarchy
  - `20260219_executive_permissions.sql` — Executive & management permissions
  - `20260219_scoped_employee_id.sql` — Scoped employee IDs

**Expected output:**
```
📦 Connected to PostgreSQL
🔍 Found 49 migration files
⏭️  Skipping (already recorded): 001_add_extended_employee_fields.sql
...
🚀 Running: 20260215_rbac_comprehensive.sql
✅ Done: 20260215_rbac_comprehensive.sql
...
🎉 Migration process completed safely
```

---

### Step 5: Seed Super Admin User (First-Time Only)

If you haven't created a super admin yet:

```bash
psql -h <HOST> -U <USER> -d <DB_NAME> -f backend/src/database/seed/seed_users.sql
```

This creates:
- Super Admin: `admin@gmail.com` / `Admin@123`
- A seed tenant with sample users

**Or create manually:**

```sql
-- 1. Create the super admin user
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (
    NULL,
    'admin@gmail.com',
    crypt('Admin@123', gen_salt('bf')),
    'SUPER_ADMIN',
    TRUE,
    FALSE
);

-- 2. Assign SUPER_ADMIN role in RBAC
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT u.id, r.id, NULL
FROM users u, roles r
WHERE u.email = 'admin@gmail.com' AND u.tenant_id IS NULL
  AND r.name = 'SUPER_ADMIN' AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;
```

---

### Step 6: Seed Plans (First-Time Only)

```bash
psql -h <HOST> -U <USER> -d <DB_NAME> -f backend/src/database/seed/seed_plans.sql
```

---

### Step 7: Fix Existing Users (If Upgrading)

If you already had users in production **before** the RBAC migration, they might be missing `user_roles` entries. Run this SQL to backfill:

```sql
-- Backfill user_roles for any users missing role assignments
INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT 
    u.id,
    COALESCE(
        (SELECT r.id FROM roles r WHERE r.tenant_id = u.tenant_id AND r.name = u.role LIMIT 1),
        (SELECT r.id FROM roles r WHERE r.tenant_id IS NULL AND r.name = u.role LIMIT 1)
    ) as role_id,
    u.tenant_id,
    NOW()
FROM users u
WHERE u.role IS NOT NULL AND u.is_deleted = false
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT DO NOTHING;
```

Also ensure tenant-specific roles exist:

```sql
-- Clone system roles to any tenants that don't have them
DO $$
DECLARE
    t_record RECORD;
    sys_role RECORD;
    new_role_id UUID;
BEGIN
    FOR t_record IN SELECT id FROM tenants LOOP
        FOR sys_role IN SELECT * FROM roles WHERE tenant_id IS NULL AND role_type = 'SYSTEM' LOOP
            IF NOT EXISTS (SELECT 1 FROM roles WHERE tenant_id = t_record.id AND name = sys_role.name) THEN
                INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable)
                VALUES (t_record.id, sys_role.name, sys_role.description, 'SYSTEM', false, true)
                RETURNING id INTO new_role_id;

                INSERT INTO role_permissions (role_id, permission_id)
                SELECT new_role_id, permission_id FROM role_permissions WHERE role_id = sys_role.id
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;
```

---

### Step 8: Build & Deploy Frontend

```bash
cd frontend
npm run build
```

This creates a `dist/` folder. Deploy it to your hosting provider (Vercel, Netlify, Render static site, etc.)

> **Ensure** the `VITE_API_BASE_URL` environment variable is set correctly during build.

---

### Step 9: Start Backend Server

```bash
cd backend

# Production
NODE_ENV=production node server.js

# Or with PM2 (recommended)
pm2 start server.js --name hrms-backend
```

---

### Step 10: Verify Deployment

#### Check Super Admin Login
1. Go to `https://your-frontend.com/login`
2. Login with `admin@gmail.com` / `Admin@123`
3. Should see sidebar with: **Dashboard, Tenants, Plans, Coupons, Activity, Roles**

#### Check Admin Login  
1. Register a new tenant or login with an existing admin
2. Should see sidebar with: **Dashboard, Employees, Organisation, Calendar, Reports, Assets, Payroll, Projects, Chat, Activity, Roles, Settings**

#### Debug: If Sidebar Still Missing

Check the backend logs for the `[AUTH DEBUG]` output. On login, it logs:
```
[AUTH DEBUG] User: admin@example.com (uuid), Role: ADMIN, Permissions Count: 35
```

If `Permissions Count: 0`, the RBAC data is still missing. Re-run the migration:
```bash
node src/database/run_all_migrations.js
```

Then verify the data manually:
```sql
-- Check permissions table
SELECT COUNT(*) FROM permissions;  -- Should be ~50+

-- Check roles table  
SELECT name, tenant_id, role_type FROM roles ORDER BY tenant_id NULLS FIRST;

-- Check user_roles for a specific user
SELECT u.email, u.role, r.name as rbac_role, array_agg(p.name) as permissions
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.email = '<user-email>'
GROUP BY u.email, u.role, r.name;
```

---

## Quick Reference: Deployment Checklist

| # | Step | Command |
|---|------|---------|
| 1 | Install backend deps | `cd backend && npm install` |
| 2 | Install frontend deps | `cd frontend && npm install` |
| 3 | Configure backend `.env` | Edit `backend/.env` |
| 4 | Configure frontend `.env` | Edit `frontend/.env` |
| 5 | Run base schema (fresh DB) | `psql -f backend/src/database/schema.sql` |
| 6 | **Run migrations** ⚠️ | `cd backend && node src/database/run_all_migrations.js` |
| 7 | Seed super admin | `psql -f backend/src/database/seed/seed_users.sql` |
| 8 | Seed plans | `psql -f backend/src/database/seed/seed_plans.sql` |
| 9 | Backfill user_roles | Run SQL from Step 7 above |
| 10 | Build frontend | `cd frontend && npm run build` |
| 11 | Start backend | `cd backend && node server.js` |
| 12 | Deploy frontend dist | Upload `frontend/dist/` to hosting |

---

## SSL Note

The backend automatically enables SSL for production database connections:
```js
ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
```

Make sure `NODE_ENV=production` is set in your backend `.env`.
