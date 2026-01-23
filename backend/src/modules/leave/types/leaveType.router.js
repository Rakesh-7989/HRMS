const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./leaveType.controller");
const v = require("./leaveType.validator");

router.use(verifyJwt);

router.post("/", requireRole(["ADMIN", "HR"]), validate(v.createLeaveTypeSchema), controller.createLeaveType);
router.get("/", controller.getLeaveTypes);
router.get("/:id", controller.getLeaveTypeById);
router.put("/:id", requireRole(["ADMIN", "HR"]), validate(v.updateLeaveTypeSchema), controller.updateLeaveType);
router.delete("/:id", requireRole(["ADMIN", "HR"]), controller.deleteLeaveType);

module.exports = router;
