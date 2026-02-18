const { ForbiddenError } = require('../utils/customErrors');

/**
 * Middleware that strictly enforces platform-level access.
 * Only users with tenant_id === null (Global Super Admins)
 * who also possess the required permission are allowed.
 */
function requirePlatformAdmin(permissionName) {
    return function (req, res, next) {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        // 1. Strict Requirement: User MUST be a global administrator (no tenant_id)
        // This prevents local tenant admins from escalating privileges 
        // even if they somehow got a platform permission assigned.
        if (req.user.tenantId !== null) {
            console.warn(`[SECURITY WARNING] Blocked platform access attempt from tenant user: ${req.user.email} (Tenant: ${req.user.tenantId})`);
            return next(new ForbiddenError('Platform access is restricted to global administrators only'));
        }

        // 2. Permission Check
        if (req.user.permissions && req.user.permissions.includes(permissionName)) {
            return next();
        }

        // 3. SUPER_ADMIN role bypass (for safety, though they should have the permission)
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        return next(
            new ForbiddenError('You do not have the required platform permission')
        );
    };
}

module.exports = { requirePlatformAdmin };
