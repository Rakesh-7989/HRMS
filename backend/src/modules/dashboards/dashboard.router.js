const express = require("express");
const router = express.Router();
const controller = require("./dashboard.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");

// All dashboard routes require authentication
router.use(verifyJwt);

/* ==================== SUPER_ADMIN DASHBOARD ==================== */

router.get(
  "/super-admin/stats",
  requirePermission('audit_logs', 'view'),
  controller.getSuperAdminDashboard
);
// Frontend alias
router.get(
  "/system",
  requirePermission('audit_logs', 'view'),
  controller.getSuperAdminDashboard
);

router.get(
  "/super-admin/tenants",
  requirePermission('audit_logs', 'view'),
  controller.getSuperAdminReports
);
// Frontend alias
router.get(
  "/system/reports",
  requirePermission('audit_logs', 'view'),
  controller.getSuperAdminReports
);

/* ==================== ADMIN DASHBOARD ==================== */

router.get(
  "/admin/stats",
  requirePermission('organisation', 'view'),
  controller.getAdminDashboard
);
// Frontend alias
router.get(
  "/organization",
  requirePermission('organisation', 'view'),
  controller.getAdminDashboard
);

/* ==================== HR/LEAVE DASHBOARD ==================== */

router.get(
  "/leave-attendance",
  requirePermission('leave', 'view'),
  controller.getHRDashboard
);
// Frontend alias
router.get(
  "/hr",
  requirePermission('leave', 'view'),
  controller.getHRDashboard
);

/* ==================== MANAGER DASHBOARD ==================== */

router.get(
  "/manager/team",
  requirePermission('attendance', 'view_team'),
  controller.getManagerDashboard
);
// Frontend alias
router.get(
  "/team",
  requirePermission('attendance', 'view_team'),
  controller.getManagerDashboard
);

/* ==================== EMPLOYEE DASHBOARD ==================== */

router.get(
  "/employee/personal",
  controller.getEmployeeDashboard
);
// Frontend alias
router.get(
  "/personal",
  controller.getEmployeeDashboard
);

module.exports = router;
