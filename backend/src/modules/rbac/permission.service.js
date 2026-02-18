const pool = require('../../config/db');

/**
 * Get all permissions for a user (aggregated across all their roles)
 */
async function getUserPermissions(userId) {
    const result = await pool.query(
        `SELECT DISTINCT p.name, p.category, p.description
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
     ORDER BY p.category, p.name`,
        [userId]
    );
    return result.rows;
}

/**
 * Get permission name strings for a user (for attaching to req.user)
 */
async function getUserPermissionNames(userId) {
    const result = await pool.query(
        `SELECT DISTINCT p.name
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
        [userId]
    );
    return result.rows.map(r => r.name);
}

/**
 * Check if user has a specific permission
 */
async function hasPermission(userId, permissionName) {
    const result = await pool.query(
        `SELECT EXISTS (
       SELECT 1
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1 AND p.name = $2
     ) AS has_perm`,
        [userId, permissionName]
    );
    return result.rows[0].has_perm;
}

/**
 * Check if user has any of the given permissions (OR)
 */
async function hasAnyPermission(userId, permissionNames) {
    if (!permissionNames || permissionNames.length === 0) return false;
    const result = await pool.query(
        `SELECT EXISTS (
       SELECT 1
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1 AND p.name = ANY($2)
     ) AS has_perm`,
        [userId, permissionNames]
    );
    return result.rows[0].has_perm;
}

/**
 * Check if user has all of the given permissions (AND)
 */
async function hasAllPermissions(userId, permissionNames) {
    if (!permissionNames || permissionNames.length === 0) return false;
    const result = await pool.query(
        `SELECT COUNT(DISTINCT p.name) AS cnt
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1 AND p.name = ANY($2)`,
        [userId, permissionNames]
    );
    return parseInt(result.rows[0].cnt) === permissionNames.length;
}

/**
 * Get all available permissions (grouped by category)
 * Non-superadmins only see non-platform categories.
 */
async function getAllPermissions(isSuperAdmin = false) {
    const query = isSuperAdmin
        ? `SELECT id, name, category, description FROM permissions ORDER BY category, name`
        : `SELECT id, name, category, description FROM permissions WHERE category != 'platform' ORDER BY category, name`;

    const result = await pool.query(query);
    // Group by category
    const grouped = {};
    for (const perm of result.rows) {
        if (!grouped[perm.category]) grouped[perm.category] = [];
        grouped[perm.category].push(perm);
    }
    return grouped;
}

/**
 * Get all available permissions as a flat list
 */
async function getAllPermissionsFlat() {
    const result = await pool.query(
        `SELECT id, name, category, description FROM permissions ORDER BY category, name`
    );
    return result.rows;
}

module.exports = {
    getUserPermissions,
    getUserPermissionNames,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllPermissions,
    getAllPermissionsFlat,
};
