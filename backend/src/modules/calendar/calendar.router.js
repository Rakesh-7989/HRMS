const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");

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

// Company Holidays Management (Admin/HR only)
router.get(
    "/company/holidays",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    controller.getCompanyHolidays
);

router.post(
    "/company/holidays",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    validate(validator.companyHolidaySchema),
    controller.createCompanyHoliday
);

router.delete(
    "/company/holidays/:id",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    controller.deleteCompanyHoliday
);

// State Holidays Management (Mainly for Super Admin / Setup)
router.post(
    "/state/holidays",
    requireRole(["SUPER_ADMIN"]),
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
    requireRole(["ADMIN", "HR"]),
    controller.createAnnouncement
);

router.delete(
    "/announcements/:id",
    requireRole(["ADMIN", "HR"]),
    controller.deleteAnnouncement
);

module.exports = router;
