const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
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
    requireRole(["ADMIN", "HR", "SUPER_ADMIN", "EMPLOYEE", "MANAGER"]),
    controller.getSettings
);

router.put(
    "/settings",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    validate(validator.updateSettingsSchema),
    controller.updateSettings
);

// ==========================================================================
// LOCATIONS (Admin/HR only for management)
// ==========================================================================

router.get(
    "/locations",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    controller.getLocations
);

router.get(
    "/locations/:id",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    controller.getLocation
);

router.post(
    "/locations",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    validate(validator.createLocationSchema),
    controller.createLocation
);

router.put(
    "/locations/:id",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    validate(validator.updateLocationSchema),
    controller.updateLocation
);

router.delete(
    "/locations/:id",
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
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
    requireRole(["ADMIN", "HR", "SUPER_ADMIN"]),
    controller.getViolations
);

module.exports = router;
