const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const validate = require("../../middleware/validate");

const controller = require("./geoFencing.controller");
const validator = require("./geoFencing.validator");

// All routes require authentication
router.use(verifyJwt);

// ==========================================================================
// SETTINGS (Admin/HR only)
// ==========================================================================

router.get(
    "/settings",
    requireAnyPermission(["view_all_employees", "manage_attendance_policies"]),
    controller.getSettings
);

router.put(
    "/settings",
    requirePermission("manage_attendance_policies"),
    validate(validator.updateSettingsSchema),
    controller.updateSettings
);

// ==========================================================================
// LOCATIONS (Admin/HR only for management)
// ==========================================================================

router.get(
    "/locations",
    requireAnyPermission(["manage_attendance_policies", "manage_organization"]),
    controller.getLocations
);

router.get(
    "/locations/:id",
    requireAnyPermission(["manage_attendance_policies", "manage_organization"]),
    controller.getLocation
);

router.post(
    "/locations",
    requirePermission("manage_attendance_policies"),
    validate(validator.createLocationSchema),
    controller.createLocation
);

router.put(
    "/locations/:id",
    requirePermission("manage_attendance_policies"),
    validate(validator.updateLocationSchema),
    controller.updateLocation
);

router.delete(
    "/locations/:id",
    requirePermission("manage_attendance_policies"),
    controller.deleteLocation
);

// ==========================================================================
// VALIDATION (All authenticated users - for clock-in/out)
// ==========================================================================

router.post(
    "/validate",
    validate(validator.validateLocationSchema),
    controller.validateLocation
);

// ==========================================================================
// VIOLATIONS (Admin/HR only)
// ==========================================================================

router.get(
    "/violations",
    requireAnyPermission(["view_all_employees", "manage_attendance_policies"]),
    controller.getViolations
);

module.exports = router;
