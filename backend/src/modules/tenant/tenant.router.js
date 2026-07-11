
const router = require("express").Router();
const controller = require("./tenant.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { createLimiter } = require("../../middleware/rateLimiter");
const { tenantRegisterSchema } = require("./tenant.validator");

const otpLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many OTP requests, please try again later.' });
const otpVerifyLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many OTP verification attempts, please try again later.' });

// Standard Registration & OTP flow
router.get("/check-availability", controller.checkAvailability);
router.post("/send-otp", otpLimiter, controller.sendOtp);
router.post("/verify-otp", otpVerifyLimiter, controller.verifyOtp);
router.post("/register", validate(tenantRegisterSchema), controller.registerTenant);

// Employee ID Settings (requires authentication)
router.get("/employee-id-settings", verifyJwt, controller.getEmployeeIdSettings);
router.post("/employee-id-prefix", verifyJwt, controller.setEmployeeIdPrefix);
router.put("/employee-id-mode", verifyJwt, controller.toggleEmployeeIdMode);

module.exports = router;
