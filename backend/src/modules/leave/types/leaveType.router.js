const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");

const controller = require("./leaveType.controller");
const v = require("./leaveType.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

router.post("/", requirePermission("leave", "manage_types"), validate(v.createLeaveTypeSchema), controller.createLeaveType);
router.get("/", controller.getLeaveTypes);
router.get("/:id", controller.getLeaveTypeById);
router.put("/:id", requirePermission("leave", "manage_types"), validate(v.updateLeaveTypeSchema), controller.updateLeaveType);
router.delete("/:id", requirePermission("leave", "manage_types"), controller.deleteLeaveType);

module.exports = router;
