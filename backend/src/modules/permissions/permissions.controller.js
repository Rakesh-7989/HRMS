const service = require("./permissions.service");

/**
 * GET /permissions – list all permissions (master catalog)
 */
exports.getAllPermissions = async (req, res, next) => {
    try {
        const grouped = await service.getPermissionsGrouped();
        res.json({ status: "success", data: grouped });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /permissions/me – get current user's effective permissions
 */
exports.getMyPermissions = async (req, res, next) => {
    try {
        const permissions = await service.getUserEffectivePermissions(
            req.user.tenantId,
            req.user.id,
            req.user.role
        );
        res.json({ status: "success", data: { permissions } });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /permissions/roles – get all roles for the tenant (system + custom)
 */
exports.getTenantRoles = async (req, res, next) => {
    try {
        const roles = await service.getTenantRoles(req.user.tenantId);
        res.json({ status: "success", data: { roles } });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /permissions/roles – create a custom role
 * Body: { name, description }
 */
exports.createCustomRole = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return res.status(400).json({
                status: "error",
                message: "Role name must be at least 2 characters",
            });
        }

        // Sanitize: uppercase, no spaces, alphanumeric + underscore only
        const roleName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");

        const systemRoles = ["SUPER_ADMIN", "ADMIN", "HR", "MANAGER", "EMPLOYEE"];
        if (systemRoles.includes(roleName)) {
            return res.status(400).json({
                status: "error",
                message: "Cannot create a role with a system role name",
            });
        }

        const result = await service.createCustomRole(
            req.user.tenantId,
            roleName,
            description,
            req.user.id
        );

        res.status(201).json({ status: "success", data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /permissions/roles/:role – delete a custom role
 */
exports.deleteCustomRole = async (req, res, next) => {
    try {
        const { role } = req.params;
        const result = await service.deleteCustomRole(req.user.tenantId, role);
        res.json({ status: "success", data: result });
    } catch (err) {
        if (err.message === "Cannot delete system roles") {
            return res.status(400).json({ status: "error", message: err.message });
        }
        next(err);
    }
};

/**
 * GET /permissions/role/:role – get permissions for a specific role
 */
exports.getRolePermissions = async (req, res, next) => {
    try {
        const { role } = req.params;
        const permissions = await service.getRolePermissions(
            req.user.tenantId,
            role
        );
        res.json({ status: "success", data: { role, permissions } });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /permissions/role/:role – bulk update role permissions
 * Body: { permissions: [{ permission_id, enabled }] }
 */
exports.updateRolePermissions = async (req, res, next) => {
    try {
        const { role } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "permissions array is required",
            });
        }

        for (const perm of permissions) {
            if (!perm.permission_id || typeof perm.enabled !== "boolean") {
                return res.status(400).json({
                    status: "error",
                    message: "Each permission must have permission_id and enabled (boolean)",
                });
            }
        }

        const result = await service.updateRolePermissions(
            req.user.tenantId,
            role,
            permissions,
            req.user.id
        );

        res.json({ status: "success", data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /permissions/user/:userId – get effective permissions for a user
 */
exports.getUserPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const pool = require("../../config/db");
        const userRes = await pool.query(
            `SELECT role FROM users WHERE id = $1 AND tenant_id = $2`,
            [userId, req.user.tenantId]
        );

        if (userRes.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const detailed = await service.getUserPermissionsDetailed(
            req.user.tenantId,
            userId,
            userRes.rows[0].role
        );

        res.json({ status: "success", data: { userId, permissions: detailed } });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /permissions/user/:userId – set user permission overrides
 * Body: { overrides: [{ permission_id, granted }] }
 */
exports.updateUserPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { overrides } = req.body;

        if (!Array.isArray(overrides) || overrides.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "overrides array is required",
            });
        }

        const pool = require("../../config/db");
        const userRes = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
            [userId, req.user.tenantId]
        );

        if (userRes.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const result = await service.updateUserOverrides(
            req.user.tenantId,
            userId,
            overrides,
            req.user.id
        );

        res.json({ status: "success", data: result });
    } catch (err) {
        next(err);
    }
};
