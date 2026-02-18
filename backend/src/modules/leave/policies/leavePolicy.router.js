const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./leavePolicy.controller");
const v = require("./leavePolicy.validator");

router.use(verifyJwt);

router.post("/", requirePermission("leave.manage_settings"), validate(v.createPolicySchema), controller.createPolicy);
router.get("/", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.getPolicies);
router.get("/:id", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.getPolicyById);
router.put("/:id", requirePermission("leave.manage_settings"), validate(v.updatePolicySchema), controller.updatePolicy);
router.delete("/:id", requirePermission("leave.manage_settings"), controller.deletePolicy);
router.post("/assign", requirePermission("leave.manage_settings"), validate(v.assignPolicySchema), controller.assignPolicyToEmployee);
router.post("/run-accrual", requirePermission("leave.manage_settings"), controller.runAccrual);

module.exports = router;
