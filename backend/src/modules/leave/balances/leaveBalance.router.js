const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");

const controller = require("./leaveBalance.controller");
const v = require("./leaveBalance.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

router.get("/me", validate(v.yearQuerySchema), controller.getMyBalances);
router.get("/employee/:employeeId", requirePermission("leave", "view_balances"), controller.getEmployeeBalances);
router.post("/adjust", requirePermission("leave", "manage_policies"), validate(v.adjustBalanceSchema), controller.adjustBalance);
router.post("/bulk-allocate", requirePermission("leave", "manage_policies"), controller.bulkAllocate);
router.post("/bulk-reset", requirePermission("leave", "manage_policies"), controller.bulkResetBalances);
router.get("/employee/:employeeId/history", requirePermission("leave", "view_balances"), controller.getAdjustmentHistory);
router.post("/employee/:employeeId/reset-accrual", requirePermission("leave", "manage_policies"), validate(v.resetAccrualSchema), controller.resetAccrual);

module.exports = router;
