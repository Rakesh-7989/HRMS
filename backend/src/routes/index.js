const express = require('express');

const dbSessionContext = require('../middleware/dbSessionContext');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');

// Module routers
const authRoutes = require('../modules/auth/auth.router');
const tenantRouter = require('../modules/tenant/tenant.router');
const adminRouter = require('../modules/admin/admin.router');
const superAdminRouter = require('../modules/super_admin/superAdmin.router');
const departmentRouter = require('../modules/departments/department.router');
const designationRouter = require('../modules/designation/designation.router');
const dashboardRouter = require('../modules/dashboards/dashboard.router');
const userRouter = require('../modules/users/user.router');
const attendanceRouter = require('../modules/attendance/attendance.router');
const leaveRouter = require('../modules/leave/index.router');
const payrollRouter = require('../modules/payroll/payroll.router');
const subscriptionRouter = require('../modules/subscriptions/subscriptions.routes');
const inboxRouter = require('../modules/inbox/inbox.router');
const documentsRouter = require('../modules/documents/documents.router');
const assetManagementRouter = require('../modules/asset_management/asset_management.router');
const eventsRouter = require('../modules/events/events.router');
const auditRouter = require('../modules/audit/audit.router');
const projectManagementRouter = require('../modules/project_management/project_management.router');


const router = express.Router();

// Always attach RLS/ALS context
router.use(dbSessionContext);

router.use('/assets', assetManagementRouter);

// Public routes
router.use('/auth', authRoutes);

// Tenant module (use /tenants - plural, standard REST convention)
router.use('/tenants', tenantRouter);

// Audit Logs
router.use('/audit-logs', auditRouter);

// Subscriptions module
router.use('/subscriptions', subscriptionRouter);

// Everything below requires authentication
router.use(verifyJwt);

// Dashboards module (all authenticated users)
router.use('/dashboards', dashboardRouter);

// Admin module (ADMIN, HR)
router.use('/admin', requireRole(['ADMIN', 'HR']), adminRouter);

// Super admin module
router.use('/super-admin', requireRole(['SUPER_ADMIN']), superAdminRouter);

// Department module
router.use('/departments', departmentRouter);

// Designation module
router.use('/designations', designationRouter);

// User module - TWO MOUNTS for layered access control:
// 1. Self-service routes (no role restriction) → /users/me/profile, /users/me/password etc.
//    All authenticated users can access their own profile
// 2. Admin routes (ADMIN, HR only) → /users/:id, /users (list), CREATE/UPDATE/DELETE
//    Only admins can manage other users
router.use('/users', userRouter.selfService);
router.use('/users', userRouter);

// Attendance module
router.use('/attendance', requireRole(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']), attendanceRouter);

// Events module
router.use('/events', eventsRouter);

// Payroll module (includes: salary, payrun, statutory, settlement, 
// consultants, payslips, expenses, loans, merchants)
router.use('/payroll', payrollRouter);

// Leave module
router.use('/leave', requireRole(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']), leaveRouter);

// Inbox module
router.use('/inbox', inboxRouter);
router.use('/notifications', inboxRouter);

// Documents module
router.use('/documents', documentsRouter);

router.use('/projects', projectManagementRouter);

module.exports = router;
