const geoFencingService = require("./geoFencing.service");
const logger = require("../../config/logger");

// ==========================================================================
// SETTINGS
// ==========================================================================

exports.getSettings = async (req, res) => {
    try {
        const settings = await geoFencingService.getSettings(
            req.db,
            req.user.tenantId
        );
        res.json({
            status: "success",
            data: settings || {
                is_enabled: false,
                allow_clock_without_location: false,
                location_timeout_seconds: 30,
                require_high_accuracy: false
            }
        });
    } catch (error) {
        logger.error("Get geo-fencing settings error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const result = await geoFencingService.upsertSettings(
            req.db,
            req.user.tenantId,
            req.body,
            req.user.id
        );
        res.json({
            status: "success",
            message: "Geo-fencing settings updated",
            data: result
        });
    } catch (error) {
        logger.error("Update geo-fencing settings error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

// ==========================================================================
// LOCATIONS
// ==========================================================================

exports.getLocations = async (req, res) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const locations = await geoFencingService.getLocations(
            req.db,
            req.user.tenantId,
            includeInactive
        );
        res.json({ status: "success", data: locations });
    } catch (error) {
        logger.error("Get geo-fencing locations error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getLocation = async (req, res) => {
    try {
        const location = await geoFencingService.getLocationById(
            req.db,
            req.params.id,
            req.user.tenantId
        );
        if (!location) {
            return res.status(404).json({ status: "error", message: "Location not found" });
        }
        res.json({ status: "success", data: location });
    } catch (error) {
        logger.error("Get geo-fencing location error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createLocation = async (req, res) => {
    try {
        const result = await geoFencingService.createLocation(
            req.db,
            req.user.tenantId,
            req.body,
            req.user.id
        );
        res.status(201).json({
            status: "success",
            message: "Location created",
            data: result
        });
    } catch (error) {
        logger.error("Create geo-fencing location error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const result = await geoFencingService.updateLocation(
            req.db,
            req.params.id,
            req.user.tenantId,
            req.body,
            req.user.id
        );
        res.json({
            status: "success",
            message: "Location updated",
            data: result
        });
    } catch (error) {
        logger.error("Update geo-fencing location error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteLocation = async (req, res) => {
    try {
        await geoFencingService.deleteLocation(
            req.db,
            req.params.id,
            req.user.tenantId
        );
        res.json({ status: "success", message: "Location deleted" });
    } catch (error) {
        logger.error("Delete geo-fencing location error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

// ==========================================================================
// VALIDATION (for frontend pre-check AND backend enforcement)
// ==========================================================================

exports.validateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        const result = await geoFencingService.validateLocation(
            req.db,
            req.user.tenantId,
            latitude,
            longitude
        );

        res.json({
            status: "success",
            data: result
        });
    } catch (error) {
        logger.error("Validate location error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

// ==========================================================================
// VIOLATIONS
// ==========================================================================

exports.getViolations = async (req, res) => {
    try {
        const violations = await geoFencingService.getViolations(
            req.db,
            req.user.tenantId,
            {
                employee_id: req.query.employee_id,
                from_date: req.query.from_date,
                to_date: req.query.to_date,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            }
        );
        res.json({ status: "success", data: violations });
    } catch (error) {
        logger.error("Get geo-fencing violations error:", error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
