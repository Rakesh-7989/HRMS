const express = require("express");
const ctrl = require("./auth.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { authLimiter, passwordResetLimiter, otpLimiter, refreshLimiter, createLimiter } = require("../../middleware/rateLimiter");

const resetConfirmLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many reset confirmation attempts, please try again later.' });
const twoFactorSetupLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many 2FA setup attempts, please try again later.' });

const {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  logoutSchema
} = require("./auth.validator");

const router = express.Router();

const sanitizeLoginError = (err, req, res, next) => {
  if (err.statusCode === 400) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  next(err);
};

// Public routes
router.post("/login", authLimiter, validate(loginSchema), sanitizeLoginError, ctrl.login);
router.post("/refresh", refreshLimiter, validate(refreshSchema), ctrl.refreshToken);
router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post("/reset-password", resetConfirmLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

// Authenticated routes
router.post("/change-password", verifyJwt, validate(changePasswordSchema), ctrl.changePassword);
router.post("/logout", verifyJwt, validate(logoutSchema), ctrl.logout);
router.post("/logout-all", verifyJwt, ctrl.logoutAllOtherDevices);
router.get("/sessions", verifyJwt, ctrl.listActiveSessions);
router.post("/verify-password", verifyJwt, ctrl.verifyPassword);

// 2FA Routes
router.post("/2fa/setup", verifyJwt, twoFactorSetupLimiter, ctrl.setup2FA);
router.post("/2fa/enable", verifyJwt, ctrl.enable2FA);
router.post("/2fa/disable", verifyJwt, ctrl.disable2FA);
router.post("/2fa/verify", otpLimiter, ctrl.verify2FALogin); // Public because it uses preAuthToken

module.exports = router;
