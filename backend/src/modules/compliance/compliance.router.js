const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./compliance.controller");
const validator = require("./compliance.validator");

router.use(verifyJwt);

router.get("/reports", requirePermission("compliance", "view"), validate(validator.getReportsSchema), controller.getReports);
router.post("/reports/generate", requirePermission("compliance", "generate"), validate(validator.generateReportSchema), controller.generateReport);
router.get("/reports/:id/download", requirePermission("compliance", "download"), validate(validator.downloadReportSchema), controller.downloadReport);
router.get("/summary", requirePermission("compliance", "view"), validate(validator.getSummarySchema), controller.getSummary);
router.get("/form16/:employeeId", requirePermission("compliance", "view"), validate(validator.getForm16Schema), controller.getForm16);

module.exports = router;
