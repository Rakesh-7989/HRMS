const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./leaveBalance.controller");
const v = require("./leaveBalance.validator");

router.use(verifyJwt);

router.get("/me", validate(v.yearQuerySchema), controller.getMyBalances);
router.get("/employee/:employeeId", requireAnyPermission(["leave.manage_settings", "leave.approve", "leave.manage_balances"]), controller.getEmployeeBalances);
router.post("/adjust", requirePermission("leave.manage_balances"), validate(v.adjustBalanceSchema), controller.adjustBalance);
router.post("/bulk-allocate", requirePermission("leave.manage_balances"), controller.bulkAllocate);
router.post("/bulk-reset", requirePermission("leave.manage_balances"), controller.bulkResetBalances);
router.get("/employee/:employeeId/history", requirePermission("leave.manage_balances"), controller.getAdjustmentHistory);
router.post("/employee/:employeeId/reset-accrual", requirePermission("leave.manage_balances"), validate(v.resetAccrualSchema), controller.resetAccrual);

module.exports = router;
