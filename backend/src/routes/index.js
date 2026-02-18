const express = require('express');

const dbSessionContext = require('../middleware/dbSessionContext');
const verifyJwt = require('../middleware/verifyJwt');
const { requirePermission, requireAnyPermission } = require('../middleware/requirePermission');
const { requireFeature, checkAccess } = require('../middleware/subscription.middleware');

// Module routers
const authRoutes = require('../modules/auth/auth.router');
const tenantRouter = require('../modules/tenant/tenant.router');
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
const rbacRouter = require('../modules/rbac/rbac.router');
const hierarchyRouter = require('../modules/departments/hierarchy.router');

const router = express.Router();

// Always attach RLS/ALS context
router.use(dbSessionContext);

router.use('/assets', verifyJwt, requireFeature('asset_management'), assetManagementRouter);

// Public routes
router.use('/auth', authRoutes);

// Tenant module
router.use('/tenants', tenantRouter);

// Audit Logs
router.use('/audit-logs', auditRouter);

// Subscriptions module
router.use('/subscriptions', billingRouter);
router.use('/subscriptions', subscriptionAdminRouter);

// Everything below requires authentication
router.use(verifyJwt);

// RBAC management routes (roles, permissions)
router.use('/rbac', rbacRouter);

// Organization Hierarchy
router.use('/hierarchy', checkAccess(), hierarchyRouter);

// Dashboards module (all authenticated users)
router.use('/dashboards', checkAccess(), dashboardRouter);

// Department module
router.use('/departments', checkAccess(), departmentRouter);

// Designation module
router.use('/designations', checkAccess(), designationRouter);

// User module
router.use('/users', userRouter.selfService);
router.use('/users', checkAccess(), userRouter);

// Attendance module
router.use('/attendance', requireAnyPermission(['attendance.view_own', 'attendance.view_all']), requireFeature('attendance_tracker'), attendanceRouter);

// Geo-Fencing module
router.use('/geo-fencing', requireFeature('attendance_tracker'), geoFencingRouter);

// Events module
router.use('/events', eventsRouter);

// Payroll module
router.use('/payroll', requireFeature('payroll_automation'), payrollRouter);

// Leave module
router.use('/leave', requireAnyPermission(['leave.view_own', 'leave.view_all']), requireFeature('leave_tracker'), leaveRouter);

// Inbox module
router.use('/inbox', inboxRouter);
router.use('/notifications', notificationRouter);

// Documents module
router.use('/documents', requireFeature('employee_management.document_storage'), documentsRouter);

router.use('/projects', requireFeature('project_management'), projectManagementRouter);

// WFH (Work From Home) Request module
router.use('/wfh', requireAnyPermission(['attendance.view_own', 'attendance.manage']), requireFeature('attendance_tracker'), wfhRouter);

router.use('/chat', requireFeature('collaboration'), chatRouter);
router.use('/calendar', requireFeature('leave_tracker'), calendarRouter);
router.use('/shifts', requireFeature('attendance_tracker'), shiftRouter);

module.exports = router;