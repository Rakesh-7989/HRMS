const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

// ==========================================================================
// SETTINGS
// ==========================================================================

/**
 * Get geo-fencing settings for a tenant
 */
exports.getSettings = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM geo_fencing_settings WHERE tenant_id = $1`,
        [tenantId]
    );
    return res.rows[0] || null;
};

/**
 * Create or update geo-fencing settings
 */
exports.upsertSettings = async (db, tenantId, data, actorId) => {
    const query = getQuery(db);

    const existing = await exports.getSettings(db, tenantId);

    if (existing) {
        const res = await query(
            `UPDATE geo_fencing_settings 
             SET is_enabled = $1,
                 allow_clock_without_location = $2,
                 location_timeout_seconds = $3,
                 require_high_accuracy = $4,
                 updated_by = $5,
                 updated_at = now()
             WHERE tenant_id = $6
             RETURNING *`,
            [
                data.is_enabled ?? existing.is_enabled,
                data.allow_clock_without_location ?? existing.allow_clock_without_location,
                data.location_timeout_seconds ?? existing.location_timeout_seconds,
                data.require_high_accuracy ?? existing.require_high_accuracy,
                actorId,
                tenantId
            ]
        );
        return res.rows[0];
    } else {
        const res = await query(
            `INSERT INTO geo_fencing_settings 
                (tenant_id, is_enabled, allow_clock_without_location, 
                 location_timeout_seconds, require_high_accuracy, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                tenantId,
                data.is_enabled ?? false,
                data.allow_clock_without_location ?? false,
                data.location_timeout_seconds ?? 30,
                data.require_high_accuracy ?? false,
                actorId
            ]
        );
        return res.rows[0];
    }
};

// ==========================================================================
// LOCATIONS
// ==========================================================================

/**
 * Get all geo-fence locations for a tenant
 */
exports.getLocations = async (db, tenantId, includeInactive = false) => {
    const query = getQuery(db);

    let sql = `SELECT * FROM geo_fencing_locations WHERE tenant_id = $1`;
    if (!includeInactive) {
        sql += ` AND is_active = true`;
    }
    sql += ` ORDER BY name ASC`;

    const res = await query(sql, [tenantId]);
    return res.rows;
};

/**
 * Get a single location by ID
 */
exports.getLocationById = async (db, id, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM geo_fencing_locations WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );
    return res.rows[0] || null;
};

/**
 * Create a new geo-fence location
 */
exports.createLocation = async (db, tenantId, data, actorId) => {
    const query = getQuery(db);

    const res = await query(
        `INSERT INTO geo_fencing_locations 
            (tenant_id, name, description, latitude, longitude, 
             radius_meters, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            tenantId,
            data.name,
            data.description || null,
            data.latitude,
            data.longitude,
            data.radius_meters || 100,
            data.is_active !== false,
            actorId
        ]
    );
    return res.rows[0];
};

/**
 * Update a geo-fence location
 */
exports.updateLocation = async (db, id, tenantId, data, actorId) => {
    const query = getQuery(db);

    const existing = await exports.getLocationById(db, id, tenantId);
    if (!existing) {
        throw new Error("Location not found");
    }

    const res = await query(
        `UPDATE geo_fencing_locations 
         SET name = $1,
             description = $2,
             latitude = $3,
             longitude = $4,
             radius_meters = $5,
             is_active = $6,
             updated_by = $7,
             updated_at = now()
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`,
        [
            data.name ?? existing.name,
            data.description ?? existing.description,
            data.latitude ?? existing.latitude,
            data.longitude ?? existing.longitude,
            data.radius_meters ?? existing.radius_meters,
            data.is_active ?? existing.is_active,
            actorId,
            id,
            tenantId
        ]
    );
    return res.rows[0];
};

/**
 * Delete a geo-fence location
 */
exports.deleteLocation = async (db, id, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `DELETE FROM geo_fencing_locations WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [id, tenantId]
    );
    if (res.rowCount === 0) {
        throw new Error("Location not found");
    }
    return { success: true };
};

// ==========================================================================
// VALIDATION
// ==========================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Validate if employee location is within allowed geo-fence
 * Returns: { allowed: boolean, location?: object, distance?: number, reason?: string }
 */
exports.validateLocation = async (db, tenantId, employeeLat, employeeLon) => {
    const query = getQuery(db);

    // Get settings
    const settings = await exports.getSettings(db, tenantId);

    // If geo-fencing is disabled, allow
    if (!settings || !settings.is_enabled) {
        return { allowed: true, reason: 'GEO_FENCE_DISABLED' };
    }

    // If no coordinates provided
    if (!employeeLat || !employeeLon) {
        if (settings.allow_clock_without_location) {
            return { allowed: true, reason: 'LOCATION_NOT_REQUIRED' };
        }
        return { allowed: false, reason: 'LOCATION_REQUIRED' };
    }

    // Get all active locations
    const locations = await exports.getLocations(db, tenantId, false);

    if (locations.length === 0) {
        // No locations configured but geo-fencing is on
        // Fallback: allow clock-in (admin needs to configure locations)
        return { allowed: true, reason: 'NO_LOCATIONS_CONFIGURED' };
    }

    // Find the nearest location and check if within radius
    let nearestLocation = null;
    let minDistance = Infinity;

    for (const loc of locations) {
        const distance = calculateDistance(
            parseFloat(employeeLat),
            parseFloat(employeeLon),
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestLocation = loc;
        }

        // If within any location's radius, allow
        if (distance <= loc.radius_meters) {
            return {
                allowed: true,
                location: loc,
                distance: Math.round(distance),
                reason: 'WITHIN_ALLOWED_ZONE'
            };
        }
    }

    // Outside all allowed zones
    return {
        allowed: false,
        location: nearestLocation,
        distance: Math.round(minDistance),
        reason: 'OUTSIDE_ALLOWED_ZONE'
    };
};

// ==========================================================================
// VIOLATIONS LOG
// ==========================================================================

/**
 * Log a geo-fence violation
 */
exports.logViolation = async (db, tenantId, employeeId, data) => {
    const query = getQuery(db);

    await query(
        `INSERT INTO geo_fence_violations 
            (tenant_id, employee_id, action_type, employee_latitude, 
             employee_longitude, nearest_location_id, distance_meters, violation_reason, device_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            tenantId,
            employeeId,
            data.action_type,
            data.latitude || null,
            data.longitude || null,
            data.nearest_location_id || null,
            data.distance_meters || null,
            data.violation_reason,
            data.device_type || 'Unknown'
        ]
    );
};

/**
 * Get violation history
 */
exports.getViolations = async (db, tenantId, filters = {}) => {
    const query = getQuery(db);

    let sql = `
        SELECT v.*, 
               e.first_name, e.last_name,
               l.name AS location_name
        FROM geo_fence_violations v
        JOIN employees e ON e.id = v.employee_id
        LEFT JOIN geo_fencing_locations l ON l.id = v.nearest_location_id
        WHERE v.tenant_id = $1
    `;
    const params = [tenantId];
    let p = 2;

    if (filters.employee_id) {
        sql += ` AND v.employee_id = $${p}`;
        params.push(filters.employee_id);
        p++;
    }

    if (filters.from_date) {
        sql += ` AND v.created_at >= $${p}`;
        params.push(filters.from_date);
        p++;
    }

    if (filters.to_date) {
        sql += ` AND v.created_at <= $${p}`;
        params.push(filters.to_date);
        p++;
    }

    sql += ` ORDER BY v.created_at DESC LIMIT $${p} OFFSET $${p + 1}`;
    params.push(filters.limit || 50, filters.offset || 0);

    const res = await query(sql, params);
    return res.rows;
};
