const express = require("express");
const router = express.Router();

const validate = require("../../../middleware/validate");

const controller = require("./leaveReport.controller");
const v = require("./leaveReport.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.get("/trends", requirePermission("leave", "view"), validate(v.reportQuerySchema), controller.getLeaveTrendReport);
router.get("/absenteeism", requirePermission("leave", "view"), validate(v.reportQuerySchema), controller.getAbsenteeismReport);
router.get("/department", requirePermission("leave", "view"), validate(v.reportQuerySchema), controller.getDepartmentWiseReport);
router.get("/employee/:employeeId", requirePermission("leave", "view"), controller.getEmployeeLeaveReport);
router.get("/pending-ageing", requirePermission("leave", "view"), controller.getPendingAgeingReport);
router.get("/upcoming", requirePermission("leave", "view"), controller.getUpcomingLeavesReport);

module.exports = router;
