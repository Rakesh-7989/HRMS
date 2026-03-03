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
    requirePermission("geo_fencing", "view"),
    controller.getSettings
);

router.put(
    "/settings",
    requirePermission("geo_fencing", "manage_settings"),
    validate(validator.updateSettingsSchema),
    controller.updateSettings
);

// ==========================================================================
// LOCATIONS
// ==========================================================================

router.get(
    "/locations",
    requirePermission("geo_fencing", "view"),
    controller.getLocations
);

router.get(
    "/locations/:id",
    requirePermission("geo_fencing", "view"),
    controller.getLocation
);

router.post(
    "/locations",
    requirePermission("geo_fencing", "manage_locations"),
    validate(validator.createLocationSchema),
    controller.createLocation
);

router.put(
    "/locations/:id",
    requirePermission("geo_fencing", "manage_locations"),
    validate(validator.updateLocationSchema),
    controller.updateLocation
);

router.delete(
    "/locations/:id",
    requirePermission("geo_fencing", "manage_locations"),
    controller.deleteLocation
);

// ==========================================================================
// VALIDATION (Clock-in/out - no specific permission needed beyond auth, but 'view' covers it)
// ==========================================================================

router.post(
    "/validate",
    requirePermission("geo_fencing", "view"),
    validate(validator.validateLocationSchema),
    controller.validateLocation
);

// ==========================================================================
// VIOLATIONS
// ==========================================================================

router.get(
    "/violations",
    requirePermission("geo_fencing", "view_violations"),
    controller.getViolations
);

module.exports = router;
