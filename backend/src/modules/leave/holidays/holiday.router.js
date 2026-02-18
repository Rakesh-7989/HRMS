const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./holiday.controller");
const v = require("./holiday.validator");

router.use(verifyJwt);

// Public Holidays
router.post("/", requireAnyPermission(["leave.manage_settings"]), validate(v.createHolidaySchema), controller.createPublicHoliday);
router.get("/", validate(v.yearQuerySchema), controller.getPublicHolidays);
router.delete("/:id", requireAnyPermission(["leave.manage_settings"]), controller.deletePublicHoliday);
router.post("/upload", requireAnyPermission(["leave.manage_settings"]), validate(v.uploadHolidaysSchema), controller.uploadHolidaysCSV);

// Restricted (Floating) Holidays
router.post("/restricted", requireAnyPermission(["leave.manage_settings"]), validate(v.createRestrictedHolidaySchema), controller.createRestrictedHoliday);
router.get("/restricted", validate(v.yearQuerySchema), controller.getRestrictedHolidays);
router.delete("/restricted/:id", requireAnyPermission(["leave.manage_settings"]), controller.deleteRestrictedHoliday);
router.post("/restricted/:id/claim", controller.claimRestrictedHoliday);
router.get("/restricted/my-usage", controller.getMyRestrictedHolidayUsage);

module.exports = router;
