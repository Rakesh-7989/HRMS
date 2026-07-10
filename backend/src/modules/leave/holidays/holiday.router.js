const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");

const controller = require("./holiday.controller");
const v = require("./holiday.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

// Public holidays
router.post("/", requirePermission("calendar", "manage"), validate(v.createHolidaySchema), controller.createPublicHoliday);
router.get("/", controller.getPublicHolidays);
router.delete("/:id", requirePermission("calendar", "manage"), controller.deletePublicHoliday);
router.post("/upload", requirePermission("calendar", "manage"), validate(v.uploadHolidaysSchema), controller.uploadHolidaysCSV);

// Restricted holidays
router.post("/restricted", requirePermission("calendar", "manage"), validate(v.createRestrictedHolidaySchema), controller.createRestrictedHoliday);
router.get("/restricted", controller.getRestrictedHolidays);
router.delete("/restricted/:id", requirePermission("calendar", "manage"), controller.deleteRestrictedHoliday);
router.post("/restricted/:id/claim", controller.claimRestrictedHoliday);
router.get("/restricted/my-usage", controller.getMyRestrictedHolidayUsage);

module.exports = router;
