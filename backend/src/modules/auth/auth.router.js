const express = require("express");
const ctrl = require("./auth.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { authLimiter, passwordResetLimiter, createLimiter } = require("../../middleware/rateLimiter");

const refreshLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many refresh attempts, please try again later.' });
const resetConfirmLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many reset confirmation attempts, please try again later.' });
const twoFactorLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many 2FA attempts, please try again later.' });

const {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  logoutSchema
} = require("./auth.validator");

const router = express.Router();

// Public routes
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
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
router.post("/2fa/setup", verifyJwt, ctrl.setup2FA);
router.post("/2fa/enable", verifyJwt, ctrl.enable2FA);
router.post("/2fa/disable", verifyJwt, ctrl.disable2FA);
router.post("/2fa/verify", twoFactorLimiter, ctrl.verify2FALogin); // Public because it uses preAuthToken

module.exports = router;
