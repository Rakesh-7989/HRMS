const express = require("express");
const router = express.Router();
const controller = require("./permissions.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");

// Current user's effective permissions (all authenticated users)
router.get("/me", verifyJwt, controller.getMyPermissions);

// Auth required for management
router.use(verifyJwt);

// Admin/HR: roles and permissions (View allowed for lists, manage for changes)
router.use(requirePermission('roles', ['view', 'manage']));

// Master permission catalog
router.get("/", controller.getAllPermissions);

// ---- Custom role management ----
router.get("/roles", controller.getTenantRoles);
router.post("/roles", controller.createCustomRole);
router.delete("/roles/:role", controller.deleteCustomRole);

// Role permissions
// GET /permissions/role/:role — frontend calls this path
router.get("/role/:role", controller.getRolePermissions);
// Also support the longer path for backward compat
router.get("/role/:role/permissions", controller.getRolePermissions);

// PUT /permissions/role/:role — frontend sends PUT
router.put("/role/:role", controller.updateRolePermissions);
// Also keep POST for backward compat
router.post("/role/:role", controller.updateRolePermissions);

// ---- User-level permission overrides ----
router.get("/user/:userId", controller.getUserPermissions);
router.put("/user/:userId", controller.updateUserPermissions);

module.exports = router;
