const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./leaveType.controller");
const v = require("./leaveType.validator");

router.use(verifyJwt);

router.post("/", requirePermission("manage_leave_policies"), validate(v.createLeaveTypeSchema), controller.createLeaveType);
router.get("/", controller.getLeaveTypes);
router.get("/:id", controller.getLeaveTypeById);
router.put("/:id", requirePermission("manage_leave_policies"), validate(v.updateLeaveTypeSchema), controller.updateLeaveType);
router.delete("/:id", requirePermission("manage_leave_policies"), controller.deleteLeaveType);

module.exports = router;
