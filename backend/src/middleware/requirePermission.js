const { ForbiddenError } = require('../utils/customErrors');

/**
 * Middleware to check if the current user has a specific permission.
 * 
 * Usage:  requirePermission('employees', 'create')
 * 
 * The permission key is formed as `module:action`.
 * SUPER_ADMIN always bypasses permission checks.
 * Permissions are loaded by verifyJwt into req.user.permissions.
 */
module.exports = function requirePermission(module, action) {
    const permKey = `${module}:${action}`;

    return function (req, res, next) {
        // SUPER_ADMIN always has full access
        if (req.user && req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // If permissions haven't been loaded yet (shouldn't happen), deny
        if (!req.user || !req.user.permissions) {
            return next(
                new ForbiddenError('Permissions not loaded. Please login again.')
            );
        }

        // Check if the user has the required permission
        if (req.user.permissions.includes(permKey)) {
            return next();
        }

        return next(
            new ForbiddenError(`You do not have the "${permKey}" permission`)
        );
    };
};
