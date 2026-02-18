// src/modules/dashboards/dashboard.controller.js
const dashboardService = require("./dashboard.service");
const logger = require("../../config/logger");

/* ==================== UNIFIED DASHBOARD ==================== */

/**
 * GET /api/dashboards/me
 * Returns dashboard sections based on the user's permissions.
 * No hardcoded role checks — purely permission-driven.
 */
exports.getMyDashboard = async (req, res) => {
  try {
    const permissions = req.user.permissions || [];
    const sections = {};

    // System dashboard — platform-level analytics
    if (permissions.includes('platform.view_system_dashboard') || permissions.includes('platform.manage_tenants')) {
      try {
        sections.system = await dashboardService.getSuperAdminDashboard(req.db);
      } catch (err) {
        logger.error("Error loading system dashboard section:", err);
        sections.system = { error: "Failed to load system metrics" };
      }
    }

    // Organization dashboard — tenant-level org overview
    if (permissions.includes('admin.view_dashboard') && req.user.tenantId) {
      try {
        sections.organization = await dashboardService.getAdminDashboard(
          req.db,
          req.user.tenantId,
          req.query
        );
      } catch (err) {
        logger.error("Error loading organization dashboard section:", err);
        sections.organization = { error: "Failed to load organization metrics" };
      }
    }

    // HR Analytics — leave, attendance, workforce analytics
    if (permissions.includes('reports.view') && req.user.tenantId) {
      try {
        sections.hr = await dashboardService.getHRDashboard(
          req.db,
          req.user.tenantId,
          req.query
        );
      } catch (err) {
        logger.error("Error loading HR dashboard section:", err);
        sections.hr = { error: "Failed to load HR analytics" };
      }
    }

    // Team dashboard — direct reports and team performance
    if (permissions.includes('attendance.approve') && req.user.employeeId && req.user.tenantId) {
      try {
        sections.team = await dashboardService.getManagerDashboard(
          req.db,
          req.user.employeeId,
          req.user.tenantId
        );
      } catch (err) {
        logger.error("Error loading team dashboard section:", err);
        sections.team = { error: "Failed to load team metrics" };
      }
    }

    // Personal dashboard — employee's own data
    if (permissions.includes('attendance.view_own') && req.user.employeeId && req.user.tenantId) {
      try {
        sections.personal = await dashboardService.getEmployeeDashboard(
          req.db,
          req.user.employeeId,
          req.user.tenantId
        );
      } catch (err) {
        logger.error("Error loading personal dashboard section:", err);
        sections.personal = { error: "Failed to load personal metrics" };
      }
    }

    // Return available sections and which ones the user has access to
    res.json({
      status: "success",
      data: {
        sections,
        availableSections: Object.keys(sections),
        generatedAt: new Date()
      },
      timestamp: new Date()
    });
  } catch (err) {
    logger.error("Unified dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard",
      error: err.message
    });
  }
};

/* ==================== LEGACY ENDPOINTS (BACKWARD COMPAT) ==================== */
// These still work but internally use the same service functions.
// They are guarded by new dashboard permissions.

exports.getSuperAdminDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getSuperAdminDashboard(req.db);
    res.json({ status: "success", data: dashboard, timestamp: new Date() });
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

exports.getSuperAdminReports = async (req, res) => {
  try {
    const reports = await dashboardService.getSuperAdminReports(req.db);
    res.json({ status: "success", data: reports, timestamp: new Date() });
  } catch (err) {
    logger.error("Super admin reports error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch system reports",
      error: err.message
    });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getAdminDashboard(
      req.db, req.user.tenantId, req.query
    );
    res.json({ status: "success", data: dashboard, timestamp: new Date() });
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

exports.getHRDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getHRDashboard(
      req.db, req.user.tenantId, req.query
    );
    res.json({ status: "success", data: dashboard, timestamp: new Date() });
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

exports.getManagerDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getManagerDashboard(
      req.db, req.user.employeeId, req.user.tenantId
    );
    if (!dashboard.teamMetrics) {
      return res.status(404).json({ status: "error", message: "Manager profile not found" });
    }
    res.json({ status: "success", data: dashboard, timestamp: new Date() });
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

exports.getEmployeeDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getEmployeeDashboard(
      req.db, req.user.employeeId, req.user.tenantId
    );
    if (!dashboard.profile) {
      return res.status(404).json({ status: "error", message: "Employee profile not found" });
    }
    res.json({ status: "success", data: dashboard, timestamp: new Date() });
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
