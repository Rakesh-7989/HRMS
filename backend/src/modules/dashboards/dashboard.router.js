// src/modules/dashboards/dashboard.router.js
const router = require("express").Router();
const controller = require("./dashboard.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");

// All dashboard routes require authentication
router.use(verifyJwt);

/* ==================== SUPER_ADMIN DASHBOARD ==================== */

/**
 * GET /api/dashboards/system
 * System-wide dashboard with global analytics
 * Accessible: SUPER_ADMIN only
 */
router.get(
  "/system",
  requireRole("SUPER_ADMIN"),
  controller.getSuperAdminDashboard
);

/**
 * GET /api/dashboards/system/reports
 * System reports with SaaS analytics
 */
router.get(
  "/system/reports",
  requireRole("SUPER_ADMIN"),
  controller.getSuperAdminReports
);

/* ==================== ADMIN DASHBOARD ==================== */

/**
 * GET /api/dashboards/organization
 * Organization dashboard with tenant analytics
 * Accessible: ADMIN and HR
 */
router.get(
  "/organization",
  requireRole(["ADMIN", "HR"]),
  controller.getAdminDashboard
);

/* ==================== HR DASHBOARD ==================== */

/**
 * GET /api/dashboards/hr
 * HR analytics dashboard with leave and attendance metrics
 * Accessible: HR and ADMIN
 */
router.get(
  "/hr",
  requireRole(["HR", "ADMIN"]),
  controller.getHRDashboard
);


/**
 * GET /api/dashboards/team
 * Team dashboard with comprehensive team analytics
 * Accessible: MANAGER only
 */
router.get(
  "/team",
  requireRole("MANAGER"),
  controller.getManagerDashboard
);

/* ==================== EMPLOYEE DASHBOARD ==================== */

/**
 * GET /api/dashboards/personal
 * Personal employee dashboard with self-service analytics
 * Accessible: All authenticated users (EMPLOYEE, MANAGER, ADMIN, HR)
 */
router.get(
  "/personal",
  requireRole(["EMPLOYEE", "MANAGER", "ADMIN", "HR"]),
  controller.getEmployeeDashboard
);

module.exports = router;
