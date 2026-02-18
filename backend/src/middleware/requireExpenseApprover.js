module.exports = (req, res, next) => {
  const permissions = req.user.permissions || [];

  if (permissions.includes('approve_expense') || permissions.includes('platform.manage_tenants')) {
    return next();
  }

  return res.status(403).json({
    status: "error",
    message: "You are not allowed to approve expenses"
  });
};
