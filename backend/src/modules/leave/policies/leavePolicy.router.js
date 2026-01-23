const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./leavePolicy.controller");
const v = require("./leavePolicy.validator");

router.use(verifyJwt);

router.post("/", requireRole(["ADMIN", "HR"]), validate(v.createPolicySchema), controller.createPolicy);
router.get("/", requireRole(["ADMIN", "HR", "MANAGER"]), controller.getPolicies);
router.get("/:id", requireRole(["ADMIN", "HR", "MANAGER"]), controller.getPolicyById);
router.put("/:id", requireRole(["ADMIN", "HR"]), validate(v.updatePolicySchema), controller.updatePolicy);
router.delete("/:id", requireRole(["ADMIN", "HR"]), controller.deletePolicy);
router.post("/assign", requireRole(["ADMIN", "HR"]), validate(v.assignPolicySchema), controller.assignPolicyToEmployee);
router.post("/run-accrual", requireRole(["ADMIN", "HR"]), controller.runAccrual);

module.exports = router;
