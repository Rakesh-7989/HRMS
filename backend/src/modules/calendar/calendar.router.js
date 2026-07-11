const express = require("express");
const router = express.Router();
const multer = require("multer");

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");
const { uploadLimiter } = require("../../middleware/rateLimiter");

const controller = require("./calendar.controller");
const validator = require("./calendar.validator");

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
    }
  }
});

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
router.post(
    "/company/holidays/import",
    uploadLimiter,
    requirePermission("calendar", "manage_holidays"),
    excelUpload.single("file"),
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
