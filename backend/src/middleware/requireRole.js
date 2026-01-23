const { ForbiddenError } = require('../utils/customErrors');

module.exports = function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function (req, res, next) {
    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && !roles.includes(req.user.role))) {
      return next(
        new ForbiddenError('You do not have permission to perform this action')
      );
    }
    next();
  };
};
