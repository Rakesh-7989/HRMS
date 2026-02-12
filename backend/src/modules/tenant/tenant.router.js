
const router = require("express").Router();
const controller = require("./tenant.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { tenantRegisterSchema } = require("./tenant.validator");

// OTP verification routes (no auth required)
router.post("/send-otp", controller.sendOtp);
router.post("/verify-otp", controller.verifyOtp);

// Registration (requires verified email)
router.post("/register", validate(tenantRegisterSchema), controller.registerTenant);

// Employee ID Settings (requires authentication)
router.get("/employee-id-settings", verifyJwt, controller.getEmployeeIdSettings);
router.post("/employee-id-prefix", verifyJwt, controller.setEmployeeIdPrefix);
router.put("/employee-id-mode", verifyJwt, controller.toggleEmployeeIdMode);

module.exports = router;
