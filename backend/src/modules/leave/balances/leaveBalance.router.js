const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./leaveBalance.controller");
const v = require("./leaveBalance.validator");

router.use(verifyJwt);

router.get("/me", validate(v.yearQuerySchema), controller.getMyBalances);
router.get("/employee/:employeeId", requireRole(["ADMIN", "HR", "MANAGER"]), controller.getEmployeeBalances);
router.post("/adjust", requireRole(["ADMIN", "HR"]), validate(v.adjustBalanceSchema), controller.adjustBalance);
router.post("/bulk-allocate", requireRole(["ADMIN", "HR"]), controller.bulkAllocate);
router.post("/bulk-reset", requireRole(["ADMIN", "HR"]), controller.bulkResetBalances);
router.get("/employee/:employeeId/history", requireRole(["ADMIN", "HR"]), controller.getAdjustmentHistory);
router.post("/employee/:employeeId/reset-accrual", requireRole(["ADMIN", "HR"]), validate(v.resetAccrualSchema), controller.resetAccrual);

module.exports = router;
