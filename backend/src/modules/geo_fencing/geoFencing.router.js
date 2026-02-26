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
    requireAnyPermission(["view_geofencing", "manage_geofencing", "manage_attendance_policies"]),
    controller.getSettings
);

router.put(
    "/settings",
    requirePermission("manage_geofencing"),
    validate(validator.updateSettingsSchema),
    controller.updateSettings
);

// ==========================================================================
// LOCATIONS (Admin/HR only for management)
// ==========================================================================

router.get(
    "/locations",
    requireAnyPermission(["manage_geofencing", "manage_attendance_policies"]),
    controller.getLocations
);

router.get(
    "/locations/:id",
    requireAnyPermission(["view_geofencing", "manage_geofencing", "manage_attendance_policies"]),
    controller.getLocation
);

router.post(
    "/locations",
    requirePermission("manage_geofencing"),
    validate(validator.createLocationSchema),
    controller.createLocation
);

router.put(
    "/locations/:id",
    requirePermission("manage_geofencing"),
    validate(validator.updateLocationSchema),
    controller.updateLocation
);

router.delete(
    "/locations/:id",
    requirePermission("manage_geofencing"),
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
    requireAnyPermission(["view_geofencing", "manage_geofencing", "manage_attendance_policies"]),
    controller.getViolations
);

module.exports = router;
