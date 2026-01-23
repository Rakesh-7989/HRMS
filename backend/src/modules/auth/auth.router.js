const express = require("express");
const ctrl = require("./auth.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");

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
router.post("/login", validate(loginSchema), ctrl.login);
router.post("/refresh", validate(refreshSchema), ctrl.refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), ctrl.resetPassword);

// Authenticated routes
router.post("/change-password", verifyJwt, validate(changePasswordSchema), ctrl.changePassword);
router.post("/logout", validate(logoutSchema), ctrl.logout);
router.post("/logout-all", verifyJwt, ctrl.logoutAllOtherDevices);
router.get("/sessions", verifyJwt, ctrl.listActiveSessions);

module.exports = router;
