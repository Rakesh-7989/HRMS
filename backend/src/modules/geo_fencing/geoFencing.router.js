const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");
const validate = require("../../middleware/validate");

const controller = require("./geoFencing.controller");
const validator = require("./geoFencing.validator");

// All routes require authentication
router.use(verifyJwt);

// ==========================================================================
// SETTINGS
// ==========================================================================

router.get(
    "/settings",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    controller.getSettings
);

router.get(
    "/locations",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    controller.getLocations
);

router.get(
    "/locations/:id",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    controller.getLocation
);

router.post(
    "/locations",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    validate(validator.createLocationSchema),
    controller.createLocation
);

router.put(
    "/locations/:id",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    validate(validator.updateLocationSchema),
    controller.updateLocation
);

router.delete(
    "/locations/:id",
    requirePermission("attendance", ["manage_geofence", "manage"]),
    controller.deleteLocation
);

// ==========================================================================
// VALIDATION (Clock-in/out - no specific permission needed beyond auth, but 'view' covers it)
// ==========================================================================

router.post(
    "/validate",
    requirePermission("attendance", "clock_in_out"),
    validate(validator.validateLocationSchema),
    controller.validateLocation
);

// ==========================================================================
// VIOLATIONS
// ==========================================================================

router.get(
    "/violations",
    requirePermission("attendance", ["view_geofence_violations", "manage"]),
    controller.getViolations
);

module.exports = router;
