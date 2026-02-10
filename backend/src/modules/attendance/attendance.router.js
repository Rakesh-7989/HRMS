const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");

const controller = require("./attendance.controller");
const validator = require("./attendance.validator");

// All routes require authentication
router.use(verifyJwt);

// ===== EMPLOYEE, MANAGER & HR ENDPOINTS (Not for ADMIN/SUPER_ADMIN) =====

// Clock in (EMPLOYEE, MANAGER, and HR can clock in)
router.post(
  "/clock-in",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  validate(validator.clockInSchema),
  controller.clockIn
);

// Clock out (EMPLOYEE, MANAGER, and HR can clock out)
router.post(
  "/clock-out",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  validate(validator.clockOutSchema),
  controller.clockOut
);

// Start Break
router.post(
  "/break/start",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.startBreak
);

// End Break
router.post(
  "/break/end",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.endBreak
);

// Get Break History
router.get(
  "/break/history",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.getBreakHistory
);

// Get Currently On Break (Manager/HR/Admin)
router.get(
  "/break/current",
  requireRole(["MANAGER", "HR", "ADMIN"]),
  controller.getCurrentBreaks
);

// Get today's attendance (All authenticated users can view)
router.get("/today", controller.getTodayAttendance);

// Get my attendance history (EMPLOYEE, MANAGER, and HR)
router.get(
  "/my-attendance",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  validate(validator.myAttendanceQuerySchema),
  controller.getMyAttendance
);

// Get my pending checkouts (EMPLOYEE, MANAGER, and HR)
router.get(
  "/pending/my",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.getPendingCheckouts
);

// Confirm checkout (EMPLOYEE, MANAGER, and HR)
router.post(
  "/:id/confirm-checkout",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  validate(validator.confirmCheckoutSchema),
  controller.confirmCheckout
);

// ===== MANAGER / ADMIN / HR =====

// Get team attendance (direct reports of manager)
router.get(
  "/team/attendance",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(validator.teamAttendanceQuerySchema),
  controller.getTeamAttendance
);

// ===== ADMIN / HR ONLY =====

// Get all attendance records
router.get(
  "/records",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(validator.attendanceRecordsQuerySchema),
  controller.getAttendanceRecords
);

// Approve attendance
router.put(
  "/:id/approve",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(validator.approveAttendanceSchema),
  controller.approveAttendance
);

// Reject attendance
router.put(
  "/:id/reject",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(validator.rejectAttendanceSchema),
  controller.rejectAttendance
);

// Get attendance summary for payroll period
router.get(
  "/summary",
  requireRole(["ADMIN", "HR"]),
  validate(validator.summaryQuerySchema),
  controller.getAttendanceSummary
);

// Get all pending checkouts (HR/Admin/Manager view)
router.get(
  "/pending",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(validator.pendingCheckoutsQuerySchema),
  controller.getPendingCheckouts
);

// Auto-approve all pending checkouts older than 24 hours
router.post(
  "/pending/auto-approve",
  requireRole(["ADMIN", "HR"]),
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

// ===== WEEKLY HOURS FOR TIMESHEET =====
// Get weekly attendance hours (for timesheet display)
router.get(
  "/my-weekly-hours",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.getWeeklyAttendanceHours
);

// ===== REGULARIZATION ENDPOINTS =====

// Apply for regularization (EMPLOYEE)
router.post(
  "/regularize",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  validate(validator.regularizationRequestSchema),
  controller.createRegularization
);

// Get my regularization requests (EMPLOYEE)
router.get(
  "/regularize/my",
  requireRole(["EMPLOYEE", "MANAGER", "HR"]),
  controller.getMyRegularizations
);

// Get pending regularization requests for team (MANAGER / HR / ADMIN)
router.get(
  "/regularize/pending",
  requireRole(["MANAGER", "HR", "ADMIN"]),
  validate(validator.pendingRegularizationQuerySchema),
  controller.getPendingRegularizations
);

// Review regularization (Approve/Reject) (MANAGER / HR / ADMIN)
router.put(
  "/regularize/:id/review",
  requireRole(["MANAGER", "HR", "ADMIN"]),
  validate(validator.regularizationReviewSchema),
  controller.reviewRegularization
);

module.exports = router;
