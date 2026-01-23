const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./leaveReport.controller");
const v = require("./leaveReport.validator");

router.use(verifyJwt);

router.get("/trends", requireRole(["ADMIN", "HR"]), validate(v.reportQuerySchema), controller.getLeaveTrendReport);
router.get("/absenteeism", requireRole(["ADMIN", "HR"]), validate(v.reportQuerySchema), controller.getAbsenteeismReport);
router.get("/department", requireRole(["ADMIN", "HR"]), validate(v.reportQuerySchema), controller.getDepartmentWiseReport);
router.get("/employee/:employeeId", requireRole(["ADMIN", "HR", "MANAGER"]), controller.getEmployeeLeaveReport);
router.get("/pending-ageing", requireRole(["ADMIN", "HR"]), controller.getPendingAgeingReport);
router.get("/upcoming", requireRole(["ADMIN", "HR", "MANAGER"]), controller.getUpcomingLeavesReport);

module.exports = router;
