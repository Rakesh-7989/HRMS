const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");

const controller = require("./leavePolicy.controller");
const v = require("./leavePolicy.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

router.post("/", requirePermission("leave", "manage_policies"), validate(v.createPolicySchema), controller.createPolicy);
router.get("/", requirePermission("leave", "view"), controller.getPolicies);
router.get("/:id", requirePermission("leave", "view"), controller.getPolicyById);
router.put("/:id", requirePermission("leave", "manage_policies"), validate(v.updatePolicySchema), controller.updatePolicy);
router.delete("/:id", requirePermission("leave", "manage_policies"), controller.deletePolicy);
router.post("/assign", requirePermission("leave", "manage_policies"), validate(v.assignPolicySchema), controller.assignPolicyToEmployee);
router.post("/run-accrual", requirePermission("leave", "manage_policies"), controller.runAccrual);

module.exports = router;
