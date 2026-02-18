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
router.post("/apply", validate(v.applyLeaveSchema), controller.applyLeave);
router.get("/my-leaves", controller.getMyLeaves);
router.post("/:id/cancel", validate(v.cancelLeaveSchema), controller.cancelApprovedLeave);

// Manager/Admin/HR routes
router.get("/approvals", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.getPendingApprovals);
router.put("/:id/approve", requireAnyPermission(["leave.manage_settings", "leave.approve"]), validate(v.approveLeaveSchema), controller.approveLeave);
router.put("/:id/reject", requireAnyPermission(["leave.manage_settings", "leave.approve"]), validate(v.rejectLeaveSchema), controller.rejectLeave);

// Admin/HR summary
router.get("/summary", requireAnyPermission(["leave.manage_settings", "leave.approve", "reports.view"]), controller.getLeaveSummary);

module.exports = router;
