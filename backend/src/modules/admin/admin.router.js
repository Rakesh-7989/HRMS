const router = require("express").Router();
const controller = require("./admin.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { updateTenantProfileSchema } = require("./admin.validator");

// Auth required
router.use(verifyJwt);

// ADMIN + HR CAN SEE DASHBOARD
router.use(requireRole(["ADMIN", "HR"]));

// Tenant company profile (for settings page - future use)
router.get("/tenant/profile", controller.getTenantProfile);
router.put("/tenant/profile", requireRole(["ADMIN"]), validate(updateTenantProfileSchema), controller.updateTenantProfile);

// Audit logs (admin only) - for audit trail feature (future use)
router.get("/audit-logs", requireRole(["ADMIN"]), controller.getAuditLogs);

module.exports = router;
