// src/modules/dashboards/dashboard.controller.js
const dashboardService = require("./dashboard.service");
const logger = require("../../config/logger");

/* ==================== SUPER_ADMIN DASHBOARD ==================== */

/**
 * Get system dashboard with comprehensive analytics
 */
exports.getSuperAdminDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getSuperAdminDashboard(req.db);
    res.json({
      status: "success",
      data: dashboard,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Super admin dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch system dashboard",
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

/**
 * Get system reports with deep SaaS analytics
 */
exports.getSuperAdminReports = async (req, res) => {
  try {
    const reports = await dashboardService.getSuperAdminReports(req.db);
    res.json({
      status: "success",
      data: reports,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Super admin reports error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch system reports",
      error: err.message
    });
  }
};

/* ==================== ADMIN DASHBOARD ==================== */

/**
 * Get organization dashboard with comprehensive analytics
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getAdminDashboard(
      req.db,
      req.user.tenantId,
      req.query // Pass query params (startDate, endDate)
    );
    res.json({
      status: "success",
      data: dashboard,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Admin dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch organization dashboard",
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

/* ==================== HR DASHBOARD ==================== */

/**
 * Get HR analytics dashboard
 */
exports.getHRDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getHRDashboard(
      req.db,
      req.user.tenantId,
      req.query // Pass query params (startDate, endDate)
    );
    res.json({
      status: "success",
      data: dashboard,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("HR dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch HR dashboard",
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

/* ==================== MANAGER DASHBOARD ==================== */

/**
 * Get team dashboard with comprehensive team analytics
 */
exports.getManagerDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getManagerDashboard(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );

    if (!dashboard.teamMetrics) {
      return res.status(404).json({
        status: "error",
        message: "Manager profile not found"
      });
    }

    res.json({
      status: "success",
      data: dashboard,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Manager dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch team dashboard",
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

/* ==================== EMPLOYEE DASHBOARD ==================== */

/**
 * Get personal employee dashboard with analytics
 */
exports.getEmployeeDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getEmployeeDashboard(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );

    if (!dashboard.profile) {
      return res.status(404).json({
        status: "error",
        message: "Employee profile not found"
      });
    }

    res.json({
      status: "success",
      data: dashboard,
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Employee dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch personal dashboard",
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};
