module.exports = (req, res, next) => {
  const role = req.user.role;

  if (role === 'MANAGER' || role === 'HR' || role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({
    status: "error",
    message: "You are not allowed to approve expenses"
  });
};
