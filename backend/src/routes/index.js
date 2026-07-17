const express = require('express');
const router = express.Router();

const dbSessionContext = require('../middleware/dbSessionContext');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');
const { requireFeature, checkAccess } = require('../middleware/subscription.middleware');
const planGuard = require('../middleware/planGuard');

// Eager-loaded modules (lightweight / needed for auth flow)
const authRoutes = require('../modules/auth/auth.router');
const commonRouter = require('../modules/common/common.router');
const billingRouter = require('../modules/subscriptions/billing.routes');
const subscriptionAdminRouter = require('../modules/subscriptions/subscriptions.routes');
const tenantRouter = require('../modules/tenant/tenant.router');
const permissionsRouter = require('../modules/permissions/permissions.router');

// Lazy-loaded modules (deferred until first request to each mount point)
const lazy = (modPath) => (req, res, next) => require(modPath)(req, res, next);

const pool = require('../config/db');

// Health check (no auth, for monitoring)
router.get('/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
  try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch {
    health.database = 'disconnected';
    health.status = 'degraded';
  }
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Always attach RLS/ALS context
router.use(dbSessionContext);

router.use('/assets', verifyJwt, planGuard('assets.full_access'), lazy('../modules/asset_management/asset_management.router'));

// Public routes (no auth required)
router.use('/auth', authRoutes);
router.use('/common', commonRouter);

// Subscriptions module (billing routes handle their own auth)
router.use('/subscriptions', billingRouter);
router.use('/subscriptions', subscriptionAdminRouter);

// Tenant module (Public registration & OTP, plus protected settings)
router.use('/tenants', tenantRouter);

// Everything below requires authentication
router.use(verifyJwt);

// Permissions module (all authenticated users can fetch their own perms)
router.use('/permissions', lazy('../modules/permissions/permissions.router'));

// Audit Logs (requires auth)
router.use('/audit-logs', lazy('../modules/audit/audit.router'));

// Dashboards module (all authenticated users)
router.use('/dashboards', checkAccess(), lazy('../modules/dashboards/dashboard.router'));

// Admin module (ADMIN, HR)
router.use('/admin', requireRole(['ADMIN', 'HR']), checkAccess(), lazy('../modules/admin/admin.router'));

// Super admin module
router.use('/super-admin', requireRole(['SUPER_ADMIN']), lazy('../modules/super_admin/superAdmin.router'));
router.use('/dba', requireRole(['SUPER_ADMIN']), lazy('../modules/dba/dba.router'));




// Department module
router.use('/departments', checkAccess(), lazy('../modules/departments/department.router'));

// Designation module
router.use('/designations', checkAccess(), lazy('../modules/designation/designation.router'));

// User module - TWO MOUNTS for layered access control:
// 1. Self-service routes (no role restriction) → /users/me/profile, /users/me/password etc.
//    All authenticated users can access their own profile
// 2. Admin routes (ADMIN, HR only) → /users/:id, /users (list), CREATE/UPDATE/DELETE
//    Only admins can manage other users
router.use('/users', (req, res, next) => { require('../modules/users/user.router').selfService(req, res, next); });
router.use('/users', checkAccess(), (req, res, next) => { require('../modules/users/user.router')(req, res, next); });

// Attendance module
router.use('/attendance', requireFeature('attendance_tracker'), lazy('../modules/attendance/attendance.router'));

// Geo-Fencing module (for attendance location validation)
router.use('/geo-fencing', planGuard('attendance.geofencing'), lazy('../modules/geo_fencing/geoFencing.router'));

// Events module
router.use('/events', lazy('../modules/events/events.router'));

// Payroll module (includes: salary, payrun, statutory, settlement,
// consultants, payslips, expenses, loans, merchants)
router.use('/payroll', planGuard('payroll.full_access'), lazy('../modules/payroll/payroll.router'));

// Leave module
router.use('/leave', requireFeature('leave_tracker'), lazy('../modules/leave/index.router'));

// Inbox module
router.use('/inbox', lazy('../modules/inbox/inbox.router'));
router.use('/notifications', lazy('../modules/inbox/notification.router'));

// Documents module
router.use('/documents', requireFeature('employee_management.document_storage'), lazy('../modules/documents/documents.router'));

router.use('/projects', requireFeature('project_management'), lazy('../modules/project_management/project_management.router'));

// WFH (Work From Home) Request module
router.use('/wfh', requireFeature('attendance_tracker'), lazy('../modules/wfh/wfh.router'));

router.use('/chat', planGuard('collaboration.chat'), lazy('../modules/chat/chat.router'));
router.use('/calendar', requireFeature('leave_tracker'), lazy('../modules/calendar/calendar.router'));
router.use('/shifts', planGuard('attendance.scheduling'), lazy('../modules/shifts/shift.router'));

router.use('/performance', planGuard('performance.full_access'), lazy('../modules/performance/performance.router'));
router.use('/recruitment', planGuard('recruitment.full_access'), lazy('../modules/recruitment/recruitment.router'));
router.use('/bonus', planGuard('bonus.full_access'), lazy('../modules/bonus/bonus.router'));
router.use('/engagement', planGuard('engagement.full_access'), lazy('../modules/engagement/engagement.router'));
router.use('/compliance', planGuard('compliance.full_access'), lazy('../modules/compliance/compliance.router'));
router.use('/ai', planGuard('ai.full_access'), lazy('../modules/ai/ai.router'));

module.exports = router;