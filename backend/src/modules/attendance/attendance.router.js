const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

const validate = require("../../middleware/validate");

const controller = require("./attendance.controller");
const validator = require("./attendance.validator");

// All routes require authentication
router.use(verifyJwt);

// Clock in (All users with mark_attendance permission)
router.post(
  "/clock-in",
  requirePermission("mark_attendance"),
  validate(validator.clockInSchema),
  controller.clockIn
);

// Clock out
router.post(
  "/clock-out",
  requirePermission("mark_attendance"),
  validate(validator.clockOutSchema),
  controller.clockOut
);

// Start Break
router.post(
  "/break/start",
  requirePermission("mark_attendance"),
  controller.startBreak
);

// End Break
router.post(
  "/break/end",
  requirePermission("mark_attendance"),
  controller.endBreak
);

// Get Break History
router.get(
  "/break/history",
  requirePermission("view_own_attendance"),
  controller.getBreakHistory
);

// Get Currently On Break (Manager/HR/Admin)
router.get(
  "/break/current",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  controller.getCurrentBreaks
);

// Get today's attendance (All authenticated users can view)
router.get("/today", controller.getTodayAttendance);

// Get my attendance history
router.get(
  "/my-attendance",
  requirePermission("view_own_attendance"),
  validate(validator.myAttendanceQuerySchema),
  controller.getMyAttendance
);

// Get my pending checkouts
router.get(
  "/pending/my",
  requirePermission("view_own_attendance"),
  controller.getPendingCheckouts
);

// Confirm checkout
router.post(
  "/:id/confirm-checkout",
  requirePermission("mark_attendance"),
  validate(validator.confirmCheckoutSchema),
  controller.confirmCheckout
);

// ===== MANAGER / ADMIN / HR =====

// Get team attendance (direct reports of manager)
router.get(
  "/team/attendance",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.teamAttendanceQuerySchema),
  controller.getTeamAttendance
);

// ===== ADMIN / HR ONLY =====

// Get all attendance records
router.get(
  "/records",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.attendanceRecordsQuerySchema),
  controller.getAttendanceRecords
);

// Approve attendance
router.put(
  "/:id/approve",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.approveAttendanceSchema),
  controller.approveAttendance
);

// Reject attendance
router.put(
  "/:id/reject",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.rejectAttendanceSchema),
  controller.rejectAttendance
);

// Get attendance summary for payroll period
router.get(
  "/summary",
  requireAnyPermission(["manage_attendance_policies"]),
  validate(validator.summaryQuerySchema),
  controller.getAttendanceSummary
);

// Get all pending checkouts (HR/Admin/Manager view)
router.get(
  "/pending",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.pendingCheckoutsQuerySchema),
  controller.getPendingCheckouts
);

// Auto-approve all pending checkouts older than 24 hours
router.post(
  "/pending/auto-approve",
  requireAnyPermission(["manage_attendance_policies"]),
  validate(validator.autoApprovePendingSchema),
  controller.autoApprovePendingCheckouts
);

// ===== ROLE-BASED ANALYTICS ENDPOINTS =====

// Get attendance analytics based on user role
router.get(
  "/analytics",
  validate(validator.analyticsQuerySchema),
  controller.getAttendanceAnalytics
);

// Get attendance reports based on user role
router.get(
  "/reports",
  validate(validator.reportsQuerySchema),
  controller.getAttendanceReports
);

// ===== INDIVIDUAL REPORT =====
router.get(
  "/report/individual/:employeeId",
  requireAnyPermission(["view_own_attendance", "view_all_attendance", "manage_attendance_policies", "approve_attendance_regularization"]),
  controller.getIndividualEmployeeReport
);

// ===== WEEKLY HOURS FOR TIMESHEET =====
// Get weekly attendance hours (for timesheet display)
router.get(
  "/my-weekly-hours",
  requirePermission("view_own_attendance"),
  controller.getWeeklyAttendanceHours
);

// ===== REGULARIZATION ENDPOINTS =====

// Apply for regularization
router.post(
  "/regularize",
  requirePermission("mark_attendance"),
  validate(validator.regularizationRequestSchema),
  controller.createRegularization
);

// Get my regularization requests
router.get(
  "/regularize/my",
  requirePermission("view_own_attendance"),
  controller.getMyRegularizations
);

// Get pending regularization requests for team (MANAGER / HR / ADMIN)
router.get(
  "/regularize/pending",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.pendingRegularizationQuerySchema),
  controller.getPendingRegularizations
);

// Review regularization (Approve/Reject) (MANAGER / HR / ADMIN)
router.put(
  "/regularize/:id/review",
  requireAnyPermission(["manage_attendance_policies", "approve_attendance_regularization"]),
  validate(validator.regularizationReviewSchema),
  controller.reviewRegularization
);

module.exports = router;
