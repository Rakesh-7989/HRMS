const pool = require("../../config/db");
const { ForbiddenError } = require("../../utils/customErrors");


/**
 * Helper to get SQL fragment for plan-based filtering
 */
const getPlanFilter = (planType) => {
    // Standard Plan (1) excludes: payroll, assets, projects, chat, wfh, shifts, audit_logs
    // Premium Plan (2) excludes: assets, chat
    // Elite Plan (3) excludes: nothing
    if (planType === 1) {
        return "module NOT IN ('payroll', 'assets', 'chat', 'audit_logs')";
    } else if (planType === 2) {
        return "module NOT IN ('assets', 'chat')";
    }
    return "1=1"; // No filter for Elite
};

/**
 * Get all permissions from the master catalog
 */
exports.getAllPermissions = async (tenantId) => {
    // Get plan type for tenant
    const tenantRes = await pool.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const filter = getPlanFilter(planType);

    const res = await pool.query(
        `SELECT id, module, action, label, description
     FROM permissions
     WHERE ${filter}
     ORDER BY module, action`
    );
    return res.rows;
};

/**
 * Get permissions grouped by module (for UI display)
 */
exports.getPermissionsGrouped = async (tenantId) => {
    const tenantRes = await pool.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const filter = getPlanFilter(planType);

    const res = await pool.query(
        `SELECT id, module, action, label, description
     FROM permissions
     WHERE ${filter}
     ORDER BY module, action`
    );

    const grouped = {};
    for (const perm of res.rows) {
        if (!grouped[perm.module]) {
            grouped[perm.module] = [];
        }
        grouped[perm.module].push(perm);
    }
    return grouped;
};

/**
 * Get role permissions for a specific tenant + role
 */
exports.getRolePermissions = async (tenantId, role) => {
    const tenantRes = await pool.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const filter = getPlanFilter(planType);

    const res = await pool.query(
        `SELECT 
        p.id AS permission_id,
        p.module,
        p.action,
        p.label,
        p.description,
        COALESCE(rp.enabled, FALSE) AS enabled
     FROM permissions p
     LEFT JOIN role_permissions rp 
        ON rp.permission_id = p.id 
        AND rp.tenant_id = $1 
        AND rp.role = $2
     WHERE ${filter}
     ORDER BY p.module, p.action`,
        [tenantId, role]
    );
    return res.rows;
};

/**
 * Get effective permissions for a specific user (role perms + user overrides merged)
 * Returns array of permission key strings like ['employees:view', 'attendance:manage']
 */
exports.getUserEffectivePermissions = async (tenantId, userId, role) => {
    const tenantRes = await pool.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const filter = getPlanFilter(planType);

    // For SUPER_ADMIN and Tenant ADMIN, return ALL permissions (filtered by plan)
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
        const allPerms = await pool.query(
            `SELECT module, action FROM permissions WHERE ${filter}`
        );
        return allPerms.rows.map((p) => `${p.module}:${p.action}`);
    }

    const res = await pool.query(
        `SELECT 
        p.module, 
        p.action,
        COALESCE(upo.granted, rp.enabled, FALSE) AS effective
     FROM permissions p
     LEFT JOIN role_permissions rp 
        ON rp.permission_id = p.id 
        AND rp.tenant_id = $1 
        AND rp.role = $3
     LEFT JOIN user_permission_overrides upo 
        ON upo.permission_id = p.id 
        AND upo.tenant_id = $1 
        AND upo.user_id = $2
     WHERE ${filter}
     ORDER BY p.module, p.action`,
        [tenantId, userId, role]
    );

    return res.rows
        .filter((r) => r.effective === true)
        .map((r) => `${r.module}:${r.action}`);
};

/**
 * Get detailed effective permissions for a user (with override info) - for admin UI
 */
exports.getUserPermissionsDetailed = async (tenantId, userId, role) => {
    const tenantRes = await pool.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const filter = getPlanFilter(planType);

    const res = await pool.query(
        `SELECT 
        p.id AS permission_id,
        p.module,
        p.action,
        p.label,
        p.description,
        COALESCE(rp.enabled, FALSE) AS role_enabled,
        upo.granted AS user_override,
        COALESCE(upo.granted, rp.enabled, FALSE) AS effective
     FROM permissions p
     LEFT JOIN role_permissions rp 
        ON rp.permission_id = p.id 
        AND rp.tenant_id = $1 
        AND rp.role = $3
     LEFT JOIN user_permission_overrides upo 
        ON upo.permission_id = p.id 
        AND upo.tenant_id = $1 
        AND upo.user_id = $2
     WHERE ${filter}
     ORDER BY p.module, p.action`,
        [tenantId, userId, role]
    );
    return res.rows;
};

/**
 * Update role permissions (bulk toggle)
 * @param {string} tenantId
 * @param {string} role
 * @param {Array<{permission_id: string, enabled: boolean}>} permissions
 * @param {string} actorId
 */
exports.updateRolePermissions = async (tenantId, role, permissions, actorId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const perm of permissions) {
            await client.query(
                `INSERT INTO role_permissions (tenant_id, role, permission_id, enabled, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (tenant_id, role, permission_id) 
         DO UPDATE SET enabled = $4, updated_by = $5, updated_at = NOW()`,
                [tenantId, role, perm.permission_id, perm.enabled, actorId]
            );
        }

        await client.query("COMMIT");
        return { updated: permissions.length };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Set a user permission override
 */
exports.setUserOverride = async (tenantId, userId, permissionId, granted, actorId) => {
    const res = await pool.query(
        `INSERT INTO user_permission_overrides (tenant_id, user_id, permission_id, granted, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (tenant_id, user_id, permission_id)
     DO UPDATE SET granted = $4, updated_by = $5, updated_at = NOW()
     RETURNING id`,
        [tenantId, userId, permissionId, granted, actorId]
    );
    return res.rows[0];
};

/**
 * Update multiple user overrides at once
 */
exports.updateUserOverrides = async (tenantId, userId, overrides, actorId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const override of overrides) {
            if (override.granted === null || override.granted === undefined) {
                // Remove override
                await client.query(
                    `DELETE FROM user_permission_overrides 
           WHERE tenant_id = $1 AND user_id = $2 AND permission_id = $3`,
                    [tenantId, userId, override.permission_id]
                );
            } else {
                await client.query(
                    `INSERT INTO user_permission_overrides (tenant_id, user_id, permission_id, granted, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (tenant_id, user_id, permission_id)
           DO UPDATE SET granted = $4, updated_by = $5, updated_at = NOW()`,
                    [tenantId, userId, override.permission_id, override.granted, actorId]
                );
            }
        }

        await client.query("COMMIT");
        return { updated: overrides.length };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Remove a user permission override
 */
exports.removeUserOverride = async (tenantId, userId, permissionId) => {
    await pool.query(
        `DELETE FROM user_permission_overrides 
     WHERE tenant_id = $1 AND user_id = $2 AND permission_id = $3`,
        [tenantId, userId, permissionId]
    );
};

/**
 * Seed default permissions for a new tenant (called during tenant creation)
 */
exports.seedDefaultPermissionsForTenant = async (tenantId) => {
    await pool.query(`SELECT seed_role_permissions_for_tenant($1::uuid)`, [tenantId]);
};

// ===================================================================
// CUSTOM ROLE MANAGEMENT
// ===================================================================

/**
 * Get all roles that have permissions configured for this tenant,
 * plus the base system roles.
 */
exports.getTenantRoles = async (tenantId) => {
    // Get distinct roles from role_permissions for this tenant
    const res = await pool.query(
        `SELECT role, description, is_system
         FROM (
            SELECT DISTINCT ON (rp.role)
                rp.role,
                CASE WHEN r.id IS NOT NULL THEN r.description ELSE NULL END AS description,
                CASE WHEN rp.role IN ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE') THEN TRUE ELSE FALSE END AS is_system
            FROM role_permissions rp
            LEFT JOIN roles r ON r.name = rp.role
            WHERE rp.tenant_id = $1
         ) sub
         ORDER BY 
           CASE role 
             WHEN 'ADMIN' THEN 1 
             WHEN 'HR' THEN 2 
             WHEN 'MANAGER' THEN 3 
             WHEN 'EMPLOYEE' THEN 4 
             ELSE 5 
           END,
           role`,
        [tenantId]
    );

    // Ensure base roles always appear
    const baseRoles = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
    const existingRoles = res.rows.map(r => r.role);
    const roles = [...res.rows];

    for (const base of baseRoles) {
        if (!existingRoles.includes(base)) {
            roles.unshift({ role: base, description: null, is_system: true });
        }
    }

    return roles;
};

/**
 * Create a custom role and seed permissions (all disabled by default)
 */
exports.createCustomRole = async (tenantId, roleName, description, actorId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // [CUSTOM ROLE PLAN CHECK]
        const tenantRes = await client.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
        const planType = tenantRes.rows[0]?.plan_type || 1;

        if (planType === 1) { // Standard
            throw new ForbiddenError("Custom roles are not available on the STANDARD plan. Please upgrade to PREMIUM or ELITE.");
        }


        // Insert into roles table if not exists
        await client.query(
            `INSERT INTO roles (name, description)
             VALUES ($1, $2)
             ON CONFLICT (name) DO UPDATE SET description = $2`,
            [roleName, description || null]
        );

        // Seed all permissions as disabled for this tenant + role
        const perms = await client.query(`SELECT id FROM permissions`);
        for (const perm of perms.rows) {
            await client.query(
                `INSERT INTO role_permissions (tenant_id, role, permission_id, enabled, updated_by, updated_at)
                 VALUES ($1, $2, $3, FALSE, $4, NOW())
                 ON CONFLICT (tenant_id, role, permission_id) DO NOTHING`,
                [tenantId, roleName, perm.id, actorId]
            );
        }

        await client.query("COMMIT");
        return { role: roleName, description };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Delete a custom role (only non-system roles)
 */
exports.deleteCustomRole = async (tenantId, roleName) => {
    const systemRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
    if (systemRoles.includes(roleName)) {
        throw new Error('Cannot delete system roles');
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Remove all role_permissions for this tenant + role
        await client.query(
            `DELETE FROM role_permissions WHERE tenant_id = $1 AND role = $2`,
            [tenantId, roleName]
        );

        // Remove user_permission_overrides for users with this role
        await client.query(
            `DELETE FROM user_permission_overrides 
             WHERE tenant_id = $1 AND user_id IN (
               SELECT id FROM users WHERE tenant_id = $1 AND role = $2
             )`,
            [tenantId, roleName]
        );

        // Reassign users with this role to EMPLOYEE so they aren't stuck
        await client.query(
            `UPDATE users SET role = 'EMPLOYEE' WHERE tenant_id = $1 AND role = $2`,
            [tenantId, roleName]
        );

        await client.query("COMMIT");
        return { deleted: roleName };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
