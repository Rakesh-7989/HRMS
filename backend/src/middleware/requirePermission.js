const { ForbiddenError } = require('../utils/customErrors');

/**
 * Middleware that checks if the user has a specific permission.
 * Falls back to legacy role check for backward compatibility.
 */
function requirePermission(permissionName) {
    return function (req, res, next) {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        // SUPER_ADMIN always passes
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check permissions array (populated by verifyJwt)
        if (req.user.permissions && req.user.permissions.includes(permissionName)) {
            return next();
        }

        return next(
            new ForbiddenError('You do not have permission to perform this action')
        );
    };
}

/**
 * Middleware that checks if the user has ANY of the given permissions (OR).
 */
function requireAnyPermission(permissionNames = []) {
    return function (req, res, next) {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        // SUPER_ADMIN always passes
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check if user has any of the required permissions
        if (
            req.user.permissions &&
            permissionNames.some(p => req.user.permissions.includes(p))
        ) {
            return next();
        }

        console.warn(`[RBAC DEBUG] 403 Forbidden for User: ${req.user.email || req.user.id}, Role: ${req.user.role}. Required one of: ${JSON.stringify(permissionNames)}. User has: ${JSON.stringify(req.user.permissions)}`);
        return next(
            new ForbiddenError('You do not have permission to perform this action')
        );
    };
}

/**
 * Middleware that checks if the user has ALL of the given permissions (AND).
 */
function requireAllPermissions(permissionNames = []) {
    return function (req, res, next) {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        if (
            req.user.permissions &&
            permissionNames.every(p => req.user.permissions.includes(p))
        ) {
            return next();
        }

        return next(
            new ForbiddenError('You do not have permission to perform this action')
        );
    };
}

module.exports = { requirePermission, requireAnyPermission, requireAllPermissions };
