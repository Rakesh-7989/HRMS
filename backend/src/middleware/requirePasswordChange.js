module.exports = function requirePasswordChange(req, res, next) {
  // Skip checks for these endpoints
  const allowedPaths = [
    "/auth/login",
    "/auth/reset-password",
    "/auth/forgot-password",
  ];

  if (allowedPaths.includes(req.path)) {
    return next();
  }

  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      status: "error",
      message: "Password change required"
    });
  }

  next();
};
