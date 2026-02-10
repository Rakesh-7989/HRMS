const attendanceService = require("./attendance.service");
const logger = require("../../config/logger");

/**
 * CLOCK IN
 */
exports.clockIn = async (req, res) => {
  try {
    const clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection?.remoteAddress ||
      "Unknown";

    const result = await attendanceService.clockIn(
      req.db,
      req.user.employeeId,
      req.user,
      { ip: clientIp, latitude: req.body.latitude, longitude: req.body.longitude, device: req.body.device }
    );

    res.status(201).json({
      status: "success",
      message: "Clocked in successfully",
      data: result
    });
  } catch (error) {
    logger.error("Clock in error:", error.message);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * CLOCK OUT
 */
exports.clockOut = async (req, res) => {
  try {
    const clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection?.remoteAddress ||
      "Unknown";

    const result = await attendanceService.clockOut(
      req.db,
      req.user.employeeId,
      req.user,
      {
        ip: clientIp,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        device: req.body.device,
        eod_report: req.body.eod_report // Pass EOD report
      }
    );

    res.json({
      status: "success",
      message: "Clocked out successfully",
      data: result
    });
  } catch (error) {
    logger.error("Clock out error:", error.message);
    res.status(400).json({ status: "error", message: error.message });
  }
};


/**
 * START BREAK
 */
exports.startBreak = async (req, res) => {
  try {
    const result = await attendanceService.startBreak(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );
    res.json({
      status: "success",
      message: "Break started successfully",
      data: result
    });
  } catch (error) {
    logger.error("Start break error:", error.message);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * END BREAK
 */
exports.endBreak = async (req, res) => {
  try {
    const result = await attendanceService.endBreak(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );
    res.json({
      status: "success",
      message: "Break ended successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET BREAK HISTORY
 */
exports.getBreakHistory = async (req, res) => {
  try {
    const filters = {
      date: req.query.date,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    // If not HR/Admin, restrict to self (or team, if Manager logic was added, but sticking to simple self vs all for now)
    // Actually, usually MANAGERS might want to see team breaks.
    // Let's implement basics: EMPLOYEE sees self. ADMIN/HR sees all. MANAGER sees self (or could be team if we added that logic).
    // For safety: if EMPLOYEE, force employee_id.

    if (req.user.role === 'EMPLOYEE') {
      filters.employee_id = req.user.employeeId;
    } else {
      // ADMIN/HR/MANAGER can filter by specific employee if they want
      if (req.query.employee_id) {
        filters.employee_id = req.query.employee_id;
      }
    }

    const result = await attendanceService.getBreakHistory(
      req.db,
      req.user, // Pass full actor object for role checks
      filters
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get break history error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET CURRENTLY ON BREAK
 */
exports.getCurrentBreaks = async (req, res) => {
  try {
    const result = await attendanceService.getCurrentBreaks(
      req.db,
      req.user.tenantId
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get current breaks error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET TODAY
 */
exports.getTodayAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getTodayAttendance(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get today attendance error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * MY ATTENDANCE HISTORY
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getMyAttendance(
      req.db,
      req.user.employeeId,
      req.user.tenantId,
      {
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        limit: Number(req.query.limit || 30),
        offset: Number(req.query.offset || 0)
      }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get my attendance error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * TEAM ATTENDANCE
 */
exports.getTeamAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getTeamAttendance(
      req.db,
      req.user.employeeId,
      req.user.tenantId,
      {
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        limit: Number(req.query.limit || 50),
        offset: Number(req.query.offset || 0)
      }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get team attendance error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * ALL ATTENDANCE RECORDS (ADMIN / HR)
 */
exports.getAttendanceRecords = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceRecords(
      req.db,
      req.user, // Pass actor
      {
        employee_id: req.query.employee_id,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        status: req.query.status,
        limit: Number(req.query.limit || 50),
        offset: Number(req.query.offset || 0)
      }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get attendance records error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * APPROVE ATTENDANCE
 */
exports.approveAttendance = async (req, res) => {
  try {
    const result = await attendanceService.approveAttendance(
      req.db,
      req.params.id,
      req.user.tenantId,
      req.user.id,
      req.body.reason
    );
    res.json({
      status: "success",
      message: "Attendance approved",
      data: result
    });
  } catch (error) {
    logger.error("Approve attendance error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * REJECT ATTENDANCE
 */
exports.rejectAttendance = async (req, res) => {
  try {
    const result = await attendanceService.rejectAttendance(
      req.db,
      req.params.id,
      req.user.tenantId,
      req.user.id,
      req.body.reason
    );
    res.json({
      status: "success",
      message: "Attendance rejected",
      data: result
    });
  } catch (error) {
    logger.error("Reject attendance error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * ATTENDANCE SUMMARY (for payroll / dashboard)
 */
exports.getAttendanceSummary = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceSummary(
      req.db,
      req.user.tenantId,
      {
        from_date: req.query.from_date,
        to_date: req.query.to_date
      }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get attendance summary error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET PENDING CHECKOUTS (For employee/manager review)
 */
exports.getPendingCheckouts = async (req, res) => {
  try {
    const result = await attendanceService.getPendingCheckouts(
      req.db,
      req.user,
      {
        employee_id: req.query.employee_id,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        limit: Number(req.query.limit || 50),
        offset: Number(req.query.offset || 0)
      }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get pending checkouts error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * CONFIRM CHECKOUT (Employee confirms auto-checkout status)
 */
exports.confirmCheckout = async (req, res) => {
  try {
    const result = await attendanceService.confirmCheckout(
      req.db,
      req.params.id,
      req.user.tenantId,
      req.user.employeeId,
      req.body.status,
      req.body.reason
    );
    res.json({
      status: "success",
      message: "Checkout confirmed",
      data: result
    });
  } catch (error) {
    logger.error("Confirm checkout error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * AUTO-APPROVE PENDING CHECKOUTS (HR/Admin bulk approve after 24h)
 */
exports.autoApprovePendingCheckouts = async (req, res) => {
  try {
    const result = await attendanceService.autoApprovePendingCheckouts(
      req.db,
      req.user.tenantId
    );
    res.json({
      status: "success",
      message: `Auto-approved ${result.count} pending checkouts`,
      data: result
    });
  } catch (error) {
    logger.error("Auto-approve pending checkouts error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET ROLE-BASED ATTENDANCE ANALYTICS
 * HR: Organization-wide analytics
 * MANAGER: Self + team analytics
 * EMPLOYEE: Self-only analytics
 */
exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const filters = {
      from_date: from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to_date: to_date || new Date().toISOString().split('T')[0]
    };

    let analytics;

    if (req.user.role === 'HR' || req.user.role === 'ADMIN') {
      // HR/Admin: Organization-wide analytics
      analytics = await attendanceService.getOrganizationAttendanceAnalytics(
        req.db,
        req.user.tenantId,
        filters
      );
    } else if (req.user.role === 'MANAGER') {
      // Manager: Self + team analytics
      analytics = await attendanceService.getManagerAttendanceAnalytics(
        req.db,
        req.user.employeeId,
        req.user.tenantId,
        filters
      );
    } else {
      // Employee: Self-only analytics
      analytics = await attendanceService.getEmployeeAttendanceAnalytics(
        req.db,
        req.user.employeeId,
        req.user.tenantId,
        filters
      );
    }

    res.json({
      status: "success",
      message: "Attendance analytics retrieved successfully",
      data: analytics
    });
  } catch (error) {
    logger.error("Get attendance analytics error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET ATTENDANCE REPORTS BY ROLE
 * HR: Organization-wide reports
 * MANAGER: Self + team reports
 * EMPLOYEE: Self-only reports
 */
exports.getAttendanceReports = async (req, res) => {
  try {
    const { from_date, to_date, report_type, limit = 50, offset = 0 } = req.query;
    const filters = {
      from_date: from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to_date: to_date || new Date().toISOString().split('T')[0],
      report_type: report_type || 'summary',
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    let reports;

    if (req.user.role === 'HR' || req.user.role === 'ADMIN') {
      // HR/Admin: Organization-wide reports
      reports = await attendanceService.getOrganizationAttendanceReports(
        req.db,
        req.user.tenantId,
        filters
      );
    } else if (req.user.role === 'MANAGER') {
      // Manager: Self + team reports
      reports = await attendanceService.getManagerAttendanceReports(
        req.db,
        req.user.employeeId,
        req.user.tenantId,
        filters
      );
    } else {
      // Employee: Self-only reports
      reports = await attendanceService.getEmployeeAttendanceReports(
        req.db,
        req.user.employeeId,
        req.user.tenantId,
        filters
      );
    }

    res.json({
      status: "success",
      message: "Attendance reports retrieved successfully",
      data: reports
    });
  } catch (error) {
    logger.error("Get attendance reports error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * CREATE REGULARIZATION REQUEST
 */
exports.createRegularization = async (req, res) => {
  try {
    const result = await attendanceService.createRegularizationRequest(
      req.db,
      req.user.employeeId,
      req.user.tenantId,
      req.body
    );
    res.status(201).json({
      status: "success",
      message: "Regularization request submitted successfully",
      data: result
    });
  } catch (error) {
    logger.error("Create regularization error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET MY REGULARIZATION REQUESTS
 */
exports.getMyRegularizations = async (req, res) => {
  try {
    const result = await attendanceService.getMyRegularizations(
      req.db,
      req.user.employeeId,
      req.user.tenantId
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get my regularizations error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET PENDING REGULARIZATION REQUESTS (Team)
 */
exports.getPendingRegularizations = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const result = await attendanceService.getPendingRegularizations(
      req.db,
      req.user.employeeId, // Viewer (Manager/HR)
      req.user.role,
      req.user.tenantId,
      { limit, offset }
    );
    res.json({ status: "success", data: result });
  } catch (error) {
    logger.error("Get pending regularizations error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * REVIEW REGULARIZATION (Approve/Reject)
 */
exports.reviewRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    let result;
    if (status === 'APPROVED') {
      result = await attendanceService.approveRegularization(
        req.db,
        id,
        req.user.id, // Approver User ID
        req.user.tenantId
      );
    } else {
      result = await attendanceService.rejectRegularization(
        req.db,
        id,
        req.user.id,
        req.user.tenantId,
        rejection_reason
      );
    }

    res.json({
      status: "success",
      message: `Regularization request ${status.toLowerCase()}`,
      data: result
    });
  } catch (error) {
    logger.error("Review regularization error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};

/**
 * GET WEEKLY ATTENDANCE HOURS
 * Returns hours worked from clock-in/out for a given week
 */
exports.getWeeklyAttendanceHours = async (req, res) => {
  try {
    const { week_start, week_end } = req.query;

    if (!week_start || !week_end) {
      return res.status(400).json({
        status: "error",
        message: "week_start and week_end query parameters are required"
      });
    }

    const result = await attendanceService.getWeeklyAttendanceHours(
      req.db,
      req.user.employeeId,
      req.user.tenantId,
      week_start,
      week_end
    );

    res.json({
      status: "success",
      data: result
    });
  } catch (error) {
    logger.error("Get weekly attendance hours error:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
};
