const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");
const { uploadDocument } = require("../../../utils/fileUpload");

const controller = require("./leaveRequest.controller");
const v = require("./leaveRequest.validator");

router.use(verifyJwt);

// File upload route (must be before other routes)
router.post("/upload-attachment", uploadDocument.single('attachment'), controller.uploadAttachment);

// Employee routes
router.post("/apply", requirePermission("request_leave"), validate(v.applyLeaveSchema), controller.applyLeave);
router.get("/my-leaves", requirePermission("view_own_leave"), controller.getMyLeaves);
router.post("/:id/cancel", requirePermission("request_leave"), validate(v.cancelLeaveSchema), controller.cancelApprovedLeave);

// Manager/Admin/HR routes
router.get("/approvals", requireAnyPermission(["approve_leave", "view_team_leave"]), controller.getPendingApprovals);
router.put("/:id/approve", requirePermission("approve_leave"), validate(v.approveLeaveSchema), controller.approveLeave);
router.put("/:id/reject", requirePermission("approve_leave"), validate(v.rejectLeaveSchema), controller.rejectLeave);

// Admin/HR summary
router.get("/summary", requireAnyPermission(["view_all_leave", "view_hr_reports"]), controller.getLeaveSummary);

module.exports = router;
