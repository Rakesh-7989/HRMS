const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./calendar.controller");
const validator = require("./calendar.validator");

// All routes require authentication
router.use(verifyJwt);

// Get merged calendar (All roles)
router.get(
    "/view",
    validate(validator.getCalendarSchema),
    controller.getCalendar
);

// Get dynamic states list (All roles)
router.get(
    "/states",
    controller.getStates
);

// Company Holidays Management
router.get(
    "/company/holidays",
    requirePermission("calendar", "manage_holidays"),
    controller.getCompanyHolidays
);

router.post(
    "/company/holidays",
    requirePermission("calendar", "manage_holidays"),
    validate(validator.companyHolidaySchema),
    controller.createCompanyHoliday
);

router.delete(
    "/company/holidays/:id",
    requirePermission("calendar", "manage_holidays"),
    controller.deleteCompanyHoliday
);

// Bulk Import Holidays from Excel
const uploadTemp = require("multer")({ storage: require("multer").memoryStorage() });
router.post(
    "/company/holidays/import",
    requirePermission("calendar", "manage_holidays"),
    uploadTemp.single("file"),
    controller.bulkImportHolidays
);

// State Holidays Management
router.post(
    "/state/holidays",
    requirePermission("audit_logs", "view"),
    validate(validator.stateHolidaySchema),
    controller.createStateHoliday
);

// Announcements (All can view, Admin/HR can manage)
router.get(
    "/announcements",
    controller.getAnnouncements
);

router.post(
    "/announcements",
    requirePermission("calendar", "manage_announcements"),
    controller.createAnnouncement
);

router.delete(
    "/announcements/:id",
    requirePermission("calendar", "manage_announcements"),
    controller.deleteAnnouncement
);

module.exports = router;
