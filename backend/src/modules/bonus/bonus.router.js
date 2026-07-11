const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./bonus.controller");
const validator = require("./bonus.validator");

router.use(verifyJwt);

router.get("/plans", requirePermission("bonus", "view"), validate(validator.getPlansSchema), controller.getPlans);
router.post("/plans", requirePermission("bonus", "create"), validate(validator.createPlanSchema), controller.createPlan);
router.put("/plans/:id", requirePermission("bonus", "update"), validate(validator.updatePlanSchema), controller.updatePlan);

router.get("/employee-bonuses", requirePermission("bonus", "view"), validate(validator.getEmployeeBonusesSchema), controller.getEmployeeBonuses);
router.post("/employee-bonuses", requirePermission("bonus", "create"), validate(validator.createEmployeeBonusSchema), controller.createEmployeeBonus);
router.post("/employee-bonuses/:id/approve", requirePermission("bonus", "approve"), validate(validator.approveBonusSchema), controller.approveBonus);
router.post("/employee-bonuses/:id/pay", requirePermission("bonus", "manage"), validate(validator.payBonusSchema), controller.payBonus);

router.get("/commissions", requirePermission("bonus", "view"), validate(validator.getCommissionsSchema), controller.getCommissions);
router.post("/commissions", requirePermission("bonus", "create"), validate(validator.createCommissionSchema), controller.createCommission);
router.put("/commissions/:id", requirePermission("bonus", "update"), validate(validator.updateCommissionSchema), controller.updateCommission);

module.exports = router;
