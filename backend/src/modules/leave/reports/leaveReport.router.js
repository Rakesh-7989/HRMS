const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./leaveReport.controller");
const v = require("./leaveReport.validator");

router.use(verifyJwt);

router.get("/trends", requireAnyPermission(["leave.manage_settings", "reports.view"]), validate(v.reportQuerySchema), controller.getLeaveTrendReport);
router.get("/absenteeism", requireAnyPermission(["leave.manage_settings", "reports.view"]), validate(v.reportQuerySchema), controller.getAbsenteeismReport);
router.get("/department", requireAnyPermission(["leave.manage_settings", "reports.view"]), validate(v.reportQuerySchema), controller.getDepartmentWiseReport);
router.get("/employee/:employeeId", requireAnyPermission(["leave.manage_settings", "leave.approve", "reports.view"]), controller.getEmployeeLeaveReport);
router.get("/pending-ageing", requireAnyPermission(["leave.manage_settings", "reports.view"]), controller.getPendingAgeingReport);
router.get("/upcoming", requireAnyPermission(["leave.manage_settings", "leave.approve", "reports.view"]), controller.getUpcomingLeavesReport);

module.exports = router;
