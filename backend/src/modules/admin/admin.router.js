const router = require("express").Router();
const controller = require("./admin.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const { updateTenantProfileSchema } = require("./admin.validator");

// Auth required
router.use(verifyJwt);

const requirePermission = require("../../middleware/requirePermission");

// Auth required
router.use(verifyJwt);

// Tenant company profile (Organisation view/manage)
router.get("/tenant/profile", requirePermission("organisation", "view"), controller.getTenantProfile);
router.put("/tenant/profile", requirePermission("organisation", "view"), validate(updateTenantProfileSchema), controller.updateTenantProfile);

const { uploadImage } = require("../../utils/fileUpload");
router.put("/tenant/logo", requirePermission("organisation", "view"), uploadImage.single('logo'), controller.uploadLogo);
router.delete("/tenant/logo", requirePermission("organisation", "view"), controller.deleteLogo);

// Audit logs
router.get("/audit-logs", requirePermission("audit_logs", "view"), controller.getAuditLogs);

module.exports = router;
