const express = require('express');

const dbSessionContext = require('../middleware/dbSessionContext');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');
const requirePermission = require('../middleware/requirePermission');
const { requireFeature, checkAccess } = require('../middleware/subscription.middleware');
const planGuard = require('../middleware/planGuard');

// Permissions module
const permissionsRouter = require('../modules/permissions/permissions.router');

// Module routers
const authRoutes = require('../modules/auth/auth.router');
const tenantRouter = require('../modules/tenant/tenant.router');
const adminRouter = require('../modules/admin/admin.router');
const superAdminRouter = require('../modules/super_admin/superAdmin.router');
const dbaRouter = require('../modules/dba/dba.router');
const departmentRouter = require('../modules/departments/department.router');
const designationRouter = require('../modules/designation/designation.router');
const dashboardRouter = require('../modules/dashboards/dashboard.router');
const userRouter = require('../modules/users/user.router');
const attendanceRouter = require('../modules/attendance/attendance.router');
const leaveRouter = require('../modules/leave/index.router');
const payrollRouter = require('../modules/payroll/payroll.router');
const inboxRouter = require('../modules/inbox/inbox.router');
const notificationRouter = require('../modules/inbox/notification.router');
const documentsRouter = require('../modules/documents/documents.router');
const assetManagementRouter = require('../modules/asset_management/asset_management.router');
const eventsRouter = require('../modules/events/events.router');
const auditRouter = require('../modules/audit/audit.router');
const projectManagementRouter = require('../modules/project_management/project_management.router');
const geoFencingRouter = require('../modules/geo_fencing/geoFencing.router');
const calendarRouter = require('../modules/calendar/calendar.router');
const wfhRouter = require('../modules/wfh/wfh.router');
const shiftRouter = require('../modules/shifts/shift.router');
const billingRouter = require('../modules/subscriptions/billing.routes');
const subscriptionAdminRouter = require('../modules/subscriptions/subscriptions.routes');


const chatRouter = require('../modules/chat/chat.router');
const commonRouter = require('../modules/common/common.router');
const router = express.Router();

const { pool } = require('../config/database');

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

router.use('/assets', verifyJwt, planGuard('assets.full_access'), assetManagementRouter);

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
router.use('/permissions', permissionsRouter);

// Audit Logs (requires auth)
router.use('/audit-logs', auditRouter);

// Dashboards module (all authenticated users)
router.use('/dashboards', checkAccess(), dashboardRouter);

// Admin module (ADMIN, HR)
router.use('/admin', requireRole(['ADMIN', 'HR']), checkAccess(), adminRouter);

// Super admin module
router.use('/super-admin', requireRole(['SUPER_ADMIN']), superAdminRouter);
router.use('/dba', requireRole(['SUPER_ADMIN']), dbaRouter);




// Department module
router.use('/departments', checkAccess(), departmentRouter);

// Designation module
router.use('/designations', checkAccess(), designationRouter);

// User module - TWO MOUNTS for layered access control:
// 1. Self-service routes (no role restriction) → /users/me/profile, /users/me/password etc.
//    All authenticated users can access their own profile
// 2. Admin routes (ADMIN, HR only) → /users/:id, /users (list), CREATE/UPDATE/DELETE
//    Only admins can manage other users
router.use('/users', userRouter.selfService);
router.use('/users', checkAccess(), userRouter);

// Attendance module
router.use('/attendance', requireFeature('attendance_tracker'), attendanceRouter);

// Geo-Fencing module (for attendance location validation)
router.use('/geo-fencing', planGuard('attendance.geofencing'), geoFencingRouter);

// Events module
router.use('/events', eventsRouter);

// Payroll module (includes: salary, payrun, statutory, settlement,
// consultants, payslips, expenses, loans, merchants)
router.use('/payroll', planGuard('payroll.full_access'), payrollRouter);

// Leave module
router.use('/leave', requireFeature('leave_tracker'), leaveRouter);

// Inbox module
router.use('/inbox', inboxRouter);
router.use('/notifications', notificationRouter);

// Documents module
router.use('/documents', requireFeature('employee_management.document_storage'), documentsRouter);

router.use('/projects', requireFeature('project_management'), projectManagementRouter);

// WFH (Work From Home) Request module
router.use('/wfh', requireFeature('attendance_tracker'), wfhRouter);

router.use('/chat', planGuard('collaboration.chat'), chatRouter);
router.use('/calendar', requireFeature('leave_tracker'), calendarRouter);
router.use('/shifts', planGuard('attendance.scheduling'), shiftRouter);

// Phase 5 Modules
router.use('/performance', planGuard('performance.full_access'), require('../modules/performance/performance.router'));
router.use('/recruitment', planGuard('recruitment.full_access'), require('../modules/recruitment/recruitment.router'));
router.use('/bonus', planGuard('bonus.full_access'), require('../modules/bonus/bonus.router'));
router.use('/engagement', planGuard('engagement.full_access'), require('../modules/engagement/engagement.router'));
router.use('/compliance', planGuard('compliance.full_access'), require('../modules/compliance/compliance.router'));
router.use('/ai', planGuard('ai.full_access'), require('../modules/ai/ai.router'));

module.exports = router;