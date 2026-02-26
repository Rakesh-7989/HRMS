
const router = require("express").Router();
const controller = require("./tenant.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const tenantRegisterSchema = require("./tenant.validator").tenantRegisterSchema;
const updateTenantSchema = require("./tenant.validator").updateTenantSchema;
const { requirePermission } = require("../../middleware/requirePermission");
const { requirePlatformAdmin } = require("../../middleware/requirePlatformAdmin");
const { uploadImage } = require("../../utils/fileUpload");

// OTP verification routes (no auth required)
router.post("/send-otp", controller.sendOtp);
router.post("/verify-otp", controller.verifyOtp);

// Registration (requires verified email)
router.post("/register", validate(tenantRegisterSchema), controller.registerTenant);

// Middleware for authenticated tenant routes
router.use(verifyJwt);

router.get("/profile", controller.getTenantProfile);
router.put("/profile", requirePermission("manage_organization"), validate(updateTenantSchema), controller.updateTenantProfile);
router.put("/logo", requirePermission("manage_organization"), uploadImage.single('logo'), controller.uploadLogo);
router.delete("/logo", requirePermission("manage_organization"), controller.deleteLogo);

// Employee ID Settings
router.get("/employee-id-settings", requirePermission("manage_organization"), controller.getEmployeeIdSettings);
router.post("/employee-id-prefix", requirePermission("manage_organization"), controller.setEmployeeIdPrefix);

router.get("/platform/tenants", requirePlatformAdmin("platform.manage_tenants"), controller.getAllTenants);
router.get("/platform/tenants/:id", requirePlatformAdmin("platform.manage_tenants"), controller.getPlatformTenantById);
router.patch("/platform/tenants/:id/activate", requirePlatformAdmin("platform.manage_tenants"), controller.activateTenant);
router.patch("/platform/tenants/:id/deactivate", requirePlatformAdmin("platform.manage_tenants"), controller.deactivateTenant);
router.get("/platform/tenants/:id/users", requirePlatformAdmin("platform.manage_tenants"), controller.getUsersByTenant);
router.get("/platform/tenants/:id/employee-count", requirePlatformAdmin("platform.manage_tenants"), controller.getPlatformTenantEmployeeCount);

router.put("/employee-id-mode", verifyJwt, requirePermission("manage_organization"), controller.toggleEmployeeIdMode);

module.exports = router;
