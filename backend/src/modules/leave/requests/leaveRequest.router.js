const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");
const { uploadDocument } = require("../../../utils/fileUpload");

const controller = require("./leaveRequest.controller");
const v = require("./leaveRequest.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

// File upload route (must be before other routes)
router.post("/upload-attachment", uploadDocument.single('attachment'), controller.uploadAttachment);

// Employee routes
router.post("/apply", requirePermission("leave", "create"), validate(v.applyLeaveSchema), controller.applyLeave);
router.get("/my-leaves", controller.getMyLeaves);
router.post("/:id/cancel", validate(v.cancelLeaveSchema), controller.cancelApprovedLeave);

// Admin/HR summary
router.get("/summary", requirePermission("leave", "view"), controller.getLeaveSummary);

// Approvals list (Managers see direct reports, HR/Admin see all for visibility)
router.get("/approvals", requirePermission("leave", ["view", "approve"]), controller.getPendingApprovals);
router.put("/:id/approve", requirePermission("leave", "approve"), validate(v.approveLeaveSchema), controller.approveLeave);
router.put("/:id/reject", requirePermission("leave", "approve"), validate(v.rejectLeaveSchema), controller.rejectLeave);

module.exports = router;
