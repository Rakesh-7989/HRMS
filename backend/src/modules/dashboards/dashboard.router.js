// src/modules/dashboards/dashboard.router.js
const router = require("express").Router();
const controller = require("./dashboard.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

// All dashboard routes require authentication
router.use(verifyJwt);

/* ==================== UNIFIED DASHBOARD ==================== */

/**
 * GET /api/dashboards/me
 * Permission-driven unified dashboard.
 * Returns sections based on the user's assigned permissions.
 * No hardcoded role checks.
 */
router.get("/me", controller.getMyDashboard);

/* ==================== LEGACY ENDPOINTS (backward compat) ==================== */
// These use the new dashboard.* permissions, not role checks.

/**
 * GET /api/dashboards/system
 * System-wide dashboard with global analytics
 */
router.get(
  "/system",
  requirePermission("platform.view_system_dashboard"),
  controller.getSuperAdminDashboard
);

/**
 * GET /api/dashboards/system/reports
 * System reports with SaaS analytics
 */
router.get(
  "/system/reports",
  requirePermission("platform.view_system_dashboard"),
  controller.getSuperAdminReports
);

/**
 * GET /api/dashboards/organization
 * Organization dashboard with tenant analytics
 */
router.get(
  "/organization",
  requirePermission("view_admin_dashboard"),
  controller.getAdminDashboard
);

/**
 * GET /api/dashboards/hr
 * HR analytics dashboard with leave and attendance metrics
 */
router.get(
  "/hr",
  requirePermission("view_hr_reports"),
  controller.getHRDashboard
);

/**
 * GET /api/dashboards/team
 * Team dashboard with comprehensive team analytics
 */
router.get(
  "/team",
  requirePermission("approve_attendance_regularization"),
  controller.getManagerDashboard
);

/**
 * GET /api/dashboards/personal
 * Personal employee dashboard with self-service analytics
 */
router.get(
  "/personal",
  requirePermission("view_own_attendance"),
  controller.getEmployeeDashboard
);

module.exports = router;
