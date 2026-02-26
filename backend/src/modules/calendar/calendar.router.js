const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const validate = require("../../middleware/validate");

const controller = require("./calendar.controller");
const eventsController = require("../events/events.controller");
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
    requirePermission("manage_calendar"),
    controller.getCompanyHolidays
);

router.post(
    "/company/holidays",
    requirePermission("manage_calendar"),
    validate(validator.companyHolidaySchema),
    controller.createCompanyHoliday
);

router.delete(
    "/company/holidays/:id",
    requirePermission("manage_calendar"),
    controller.deleteCompanyHoliday
);

// State Holidays Management (Mainly for Super Admin / Setup)
router.post(
    "/state/holidays",
    requirePermission("platform.manage_tenants"),
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
    requireAnyPermission(["manage_calendar", "manage_announcements"]),
    controller.createAnnouncement
);

router.delete(
    "/announcements/:id",
    requireAnyPermission(["manage_calendar", "manage_announcements"]),
    controller.deleteAnnouncement
);

// People Events (Merged from events module)
router.get(
    "/people",
    requirePermission("view_calendar"),
    eventsController.getPeopleEvents
);

module.exports = router;
