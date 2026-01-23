const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./holiday.controller");
const v = require("./holiday.validator");

router.use(verifyJwt);

// Public Holidays
router.post("/", requireRole(["ADMIN", "HR"]), validate(v.createHolidaySchema), controller.createPublicHoliday);
router.get("/", validate(v.yearQuerySchema), controller.getPublicHolidays);
router.delete("/:id", requireRole(["ADMIN", "HR"]), controller.deletePublicHoliday);
router.post("/upload", requireRole(["ADMIN", "HR"]), validate(v.uploadHolidaysSchema), controller.uploadHolidaysCSV);

// Restricted (Floating) Holidays
router.post("/restricted", requireRole(["ADMIN", "HR"]), validate(v.createRestrictedHolidaySchema), controller.createRestrictedHoliday);
router.get("/restricted", validate(v.yearQuerySchema), controller.getRestrictedHolidays);
router.delete("/restricted/:id", requireRole(["ADMIN", "HR"]), controller.deleteRestrictedHoliday);
router.post("/restricted/:id/claim", controller.claimRestrictedHoliday);
router.get("/restricted/my-usage", controller.getMyRestrictedHolidayUsage);

module.exports = router;
