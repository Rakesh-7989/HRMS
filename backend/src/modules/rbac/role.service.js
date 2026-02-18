const pool = require('../../config/db');

/**
 * Get all roles for an organization (Strictly tenant-specific roles)
 * Super Admins can see global templates (tenant_id IS NULL)
 */
async function getOrganizationRoles(tenantId, isSuperAdmin = false) {
    const query = isSuperAdmin
        ? `SELECT r.*,
           (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count,
           (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count
         FROM roles r
         WHERE r.tenant_id IS NULL
         ORDER BY r.role_type, r.name`
        : `SELECT r.*,
           (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count,
           (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count
         FROM roles r
         WHERE r.tenant_id = $1 AND r.role_type != 'PLATFORM'
         ORDER BY r.role_type, r.name`;

    const params = isSuperAdmin ? [] : [tenantId];
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get a single role with its permissions
 */
async function getRoleWithPermissions(roleId) {
    const roleResult = await pool.query(
        `SELECT * FROM roles WHERE id = $1`,
        [roleId]
    );
    if (roleResult.rows.length === 0) return null;

    const permResult = await pool.query(
        `SELECT p.id, p.name, p.category, p.description
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.category, p.name`,
        [roleId]
    );

    return {
        ...roleResult.rows[0],
        permissions: permResult.rows,
    };
}

/**
 * Create a new custom role
 */
async function createRole(tenantId, { name, description, permissionIds }, createdBy) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const roleResult = await client.query(
            `INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable, created_by)
       VALUES ($1, $2, $3, 'CUSTOM', true, true, $4)
       RETURNING *`,
            [tenantId, name, description, createdBy]
        );
        const role = roleResult.rows[0];

        if (permissionIds && permissionIds.length > 0) {
            const values = permissionIds.map((pid, i) =>
                `($1, $${i + 2})`
            ).join(', ');
            await client.query(
                `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}
         ON CONFLICT DO NOTHING`,
                [role.id, ...permissionIds]
            );
        }

        await client.query('COMMIT');
        return getRoleWithPermissions(role.id);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Update role name/description and permissions
 */
async function updateRole(roleId, { name, description, permissionIds }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if role is customizable
        const check = await client.query(
            `SELECT is_customizable, role_type FROM roles WHERE id = $1`,
            [roleId]
        );
        if (check.rows.length === 0) throw new Error('Role not found');
        if (!check.rows[0].is_customizable && check.rows[0].role_type === 'PLATFORM') {
            throw new Error('Platform role cannot be modified');
        }

        await client.query(
            `UPDATE roles SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW()
       WHERE id = $1`,
            [roleId, name, description]
        );

        if (permissionIds !== undefined) {
            // Replace all permissions
            await client.query(
                `DELETE FROM role_permissions WHERE role_id = $1`,
                [roleId]
            );
            if (permissionIds.length > 0) {
                const values = permissionIds.map((pid, i) =>
                    `($1, $${i + 2})`
                ).join(', ');
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}
           ON CONFLICT DO NOTHING`,
                    [roleId, ...permissionIds]
                );
            }
        }

        await client.query('COMMIT');
        return getRoleWithPermissions(roleId);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Delete a custom role (guards: is_deletable, no active users)
 */
async function deleteRole(roleId) {
    const check = await pool.query(
        `SELECT is_deletable, (SELECT COUNT(*) FROM user_roles WHERE role_id = $1) AS user_count
     FROM roles WHERE id = $1`,
        [roleId]
    );
    if (check.rows.length === 0) throw new Error('Role not found');
    if (!check.rows[0].is_deletable) throw new Error('This role cannot be deleted');
    if (parseInt(check.rows[0].user_count) > 0) {
        throw new Error('Cannot delete role with active users. Reassign users first.');
    }

    await pool.query(`DELETE FROM roles WHERE id = $1`, [roleId]);
    return { success: true };
}

/**
 * Assign a role to a user
 */
async function assignRoleToUser(userId, roleId, tenantId, assignedBy, scopeType, scopeId) {
    const result = await pool.query(
        `INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_by, scope_type, scope_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING *`,
        [userId, roleId, tenantId, assignedBy, scopeType || null, scopeId || null]
    );

    // Also update the users.role column for backward compatibility
    const roleResult = await pool.query(`SELECT name FROM roles WHERE id = $1`, [roleId]);
    if (roleResult.rows.length > 0) {
        await pool.query(
            `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
            [roleResult.rows[0].name, userId]
        );
    }

    return result.rows[0];
}

/**
 * Remove a role from a user
 */
async function removeRoleFromUser(userId, roleId) {
    await pool.query(
        `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
        [userId, roleId]
    );

    // Update users.role to the remaining highest-priority role
    const remaining = await pool.query(
        `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY CASE r.name
       WHEN 'SUPER_ADMIN' THEN 1
       WHEN 'ADMIN' THEN 2
       ELSE 3
     END
     LIMIT 1`,
        [userId]
    );
    if (remaining.rows.length > 0) {
        await pool.query(
            `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
            [remaining.rows[0].name, userId]
        );
    }

    return { success: true };
}

/**
 * Get all roles assigned to a user
 */
async function getUserRoles(userId) {
    const result = await pool.query(
        `SELECT ur.id AS assignment_id, ur.scope_type, ur.scope_id, ur.assigned_at,
            r.id, r.name, r.description, r.role_type,
            ab.email AS assigned_by_email
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN users ab ON ab.id = ur.assigned_by
     WHERE ur.user_id = $1
     ORDER BY r.name`,
        [userId]
    );
    return result.rows;
}

/**
 * Clone system role templates for a new organization
 */
async function cloneSystemRolesForOrganization(tenantId, client = null) {
    const executor = client || pool;
    const systemRoles = await executor.query(
        `SELECT * FROM roles WHERE tenant_id IS NULL AND role_type = 'SYSTEM'`
    );

    for (const sysRole of systemRoles.rows) {
        // Create tenant-specific copy
        const newRoleResult = await executor.query(
            `INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable)
       VALUES ($1, $2, $3, 'SYSTEM', false, true)
       RETURNING id`,
            [tenantId, sysRole.name, sysRole.description]
        );

        // Copy permissions
        await executor.query(
            `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, permission_id FROM role_permissions WHERE role_id = $2`,
            [newRoleResult.rows[0].id, sysRole.id]
        );
    }
}

module.exports = {
    getOrganizationRoles,
    getRoleWithPermissions,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles,
    cloneSystemRolesForOrganization,
};
