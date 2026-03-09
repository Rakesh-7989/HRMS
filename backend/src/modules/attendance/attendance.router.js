const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");

const controller = require("./attendance.controller");
const validator = require("./attendance.validator");

const requirePermission = require("../../middleware/requirePermission");

// All routes require authentication
router.use(verifyJwt);

// ===== EMPLOYEE, MANAGER & HR ENDPOINTS =====

// Clock in
router.post(
  "/clock-in",
  requirePermission("attendance", "clock_in_out"),
  validate(validator.clockInSchema),
  controller.clockIn
);

// Clock out
router.post(
  "/clock-out",
  requirePermission("attendance", "clock_in_out"),
  validate(validator.clockOutSchema),
  controller.clockOut
);

// Start Break
router.post(
  "/break/start",
  requirePermission("attendance", "clock_in_out"),
  controller.startBreak
);

// End Break
router.post(
  "/break/end",
  requirePermission("attendance", "clock_in_out"),
  controller.endBreak
);

// Get Break History
router.get(
  "/break/history",
  requirePermission("attendance", "view_my"),
  controller.getBreakHistory
);

// Get Currently On Break (Manager/HR/Admin)
router.get(
  "/break/current",
  requirePermission("attendance", "view_team"),
  controller.getCurrentBreaks
);

// Get today's attendance (All authenticated users can view their own today)
router.get("/today", controller.getTodayAttendance);

// Get my attendance history
router.get(
  "/my-attendance",
  requirePermission("attendance", "view_my"),
  validate(validator.myAttendanceQuerySchema),
  controller.getMyAttendance
);

// Get my pending checkouts
router.get(
  "/pending/my",
  requirePermission("attendance", "clock_in_out"),
  controller.getPendingCheckouts
);

// Confirm checkout
router.post(
  "/:id/confirm-checkout",
  requirePermission("attendance", "clock_in_out"),
  validate(validator.confirmCheckoutSchema),
  controller.confirmCheckout
);

// ===== MANAGER / ADMIN / HR =====

// Get team attendance
router.get(
  "/team/attendance",
  requirePermission("attendance", "view_team"),
  validate(validator.teamAttendanceQuerySchema),
  controller.getTeamAttendance
);

// ===== ADMIN / HR / MANAGER =====

// Get all attendance records
router.get(
  "/records",
  requirePermission("attendance", "view_all"),
  validate(validator.attendanceRecordsQuerySchema),
  controller.getAttendanceRecords
);

// Approve attendance
router.put(
  "/:id/approve",
  requirePermission("attendance", "approve"),
  validate(validator.approveAttendanceSchema),
  controller.approveAttendance
);

// Reject attendance
router.put(
  "/:id/reject",
  requirePermission("attendance", "approve"),
  validate(validator.rejectAttendanceSchema),
  controller.rejectAttendance
);

// Get attendance summary for payroll period
router.get(
  "/summary",
  requirePermission("attendance", "manage_settings"),
  validate(validator.summaryQuerySchema),
  controller.getAttendanceSummary
);

// Get all pending checkouts
router.get(
  "/pending",
  requirePermission("attendance", "view_all"),
  validate(validator.pendingCheckoutsQuerySchema),
  controller.getPendingCheckouts
);

// Auto-approve all pending checkouts
router.post(
  "/pending/auto-approve",
  requirePermission("attendance", "manage_settings"),
  validate(validator.autoApprovePendingSchema),
  controller.autoApprovePendingCheckouts
);

// ===== ANALYTICS & REPORTS =====

// Analytics
router.get(
  "/analytics",
  requirePermission("attendance", "view_analytics"),
  validate(validator.analyticsQuerySchema),
  controller.getAttendanceAnalytics
);

// Reports
router.get(
  "/reports",
  requirePermission("attendance", "view_analytics"),
  validate(validator.reportsQuerySchema),
  controller.getAttendanceReports
);

// Individual Report
router.get(
  "/report/individual/:employeeId",
  requirePermission("attendance", "view_team"),
  controller.getIndividualEmployeeReport
);

// Weekly Hours for Timesheet
router.get(
  "/my-weekly-hours",
  requirePermission("attendance", "view_my"),
  controller.getWeeklyAttendanceHours
);

router.get(
  "/weekly-hours/:employeeId",
  requirePermission("attendance", "view_team"),
  controller.getWeeklyAttendanceHours
);

// ===== REGULARIZATION ENDPOINTS =====

// Apply for regularization
router.post(
  "/regularize",
  requirePermission("attendance", "regularize"),
  validate(validator.regularizationRequestSchema),
  controller.createRegularization
);

// Get my regularization requests
router.get(
  "/regularize/my",
  requirePermission("attendance", "regularize"),
  controller.getMyRegularizations
);

// Get pending regularization requests for team
router.get(
  "/regularize/pending",
  requirePermission("attendance", "regularize"),
  validate(validator.pendingRegularizationQuerySchema),
  controller.getPendingRegularizations
);

// Review regularization (Approve/Reject)
router.put(
  "/regularize/:id/review",
  requirePermission("attendance", "regularize"),
  validate(validator.regularizationReviewSchema),
  controller.reviewRegularization
);

module.exports = router;
