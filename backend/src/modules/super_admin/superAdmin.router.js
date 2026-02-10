
const router = require("express").Router();
const controller = require("./superAdmin.controller.js");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const { tenantIdParam } = require("./superAdmin.validator.js");

// protect everything with SUPER_ADMIN guard
router.use(verifyJwt, requireRole("SUPER_ADMIN"));
router.get("/tenants", controller.getAllTenants);
router.get("/tenants/:id", validate(tenantIdParam), controller.getTenantById);
router.patch("/tenants/:id/activate", validate(tenantIdParam), controller.activateTenant);
router.patch("/tenants/:id/deactivate", validate(tenantIdParam), controller.deactivateTenant);
router.get("/tenants/:id/users", validate(tenantIdParam), controller.getUsersByTenant);
router.get("/tenants/:id/employees", validate(tenantIdParam), controller.getTenantEmployeeCount);

// Plan management
router.get("/plans", controller.getPlans);
router.post("/plans", controller.createPlan);
router.put("/plans/:id", controller.updatePlan);
router.delete("/plans/:id", controller.deletePlan);

module.exports = router;
