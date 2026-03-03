const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");
const { checkLimit } = require("../../middleware/subscription.middleware");

const {
  createUserSchema,
  getUsersSchema,
  updateUserSchema,
  updateEmployeeSchema,
  changeManagerSchema,
  assignDeptSchema,
  assignDesignationSchema
} = require("./user.validator");

const uploadTemp = require("multer")({ storage: require("multer").memoryStorage() });

// Auth required for all routes
router.use(verifyJwt);

// REAL-TIME UNIQUENESS CHECK
router.get(
  "/check-unique",
  requirePermission('employees', 'create'),
  controller.checkFieldUniqueness
);

// CREATE EMPLOYEE
router.post(
  "/",
  requirePermission('employees', 'create'),
  checkLimit('employees'),
  validate(createUserSchema),
  controller.createUser
);

// BULK IMPORT
router.post(
  "/bulk-import",
  requirePermission('employees', 'import'),
  checkLimit('employees'),
  uploadTemp.single("file"),
  controller.bulkImportEmployees
);

// LIST EMPLOYEES
router.get(
  "/",
  requirePermission('employees', 'view'),
  validate(getUsersSchema),
  controller.getUsers
);

// Org Tree
router.get("/tree", controller.getOrgTree);

// REVEAL SENSITIVE (another user)
router.get(
  "/:id/reveal",
  requirePermission('employees', 'view'),
  controller.revealSensitiveField
);

// GET USER BY ID
router.get(
  "/:id",
  requirePermission('employees', 'view'),
  controller.getUserById
);

// UPDATE USER (basic)
router.put(
  "/:id",
  requirePermission('employees', 'update'),
  validate(updateUserSchema),
  controller.updateUser
);

// UPDATE EMPLOYEE DETAILS
router.put(
  "/:id/employee",
  requirePermission('employees', 'update'),
  validate(updateEmployeeSchema),
  controller.updateEmployee
);

// ROLE MANAGEMENT
router.patch(
  "/:id/role",
  requirePermission('roles', 'manage'),
  controller.changeRole
);

// CHANGE MANAGER
router.put(
  "/:id/manager",
  requirePermission('employees', 'change_manager'),
  validate(changeManagerSchema),
  controller.changeManager
);

// ASSIGN DEPARTMENT
router.put(
  "/:id/department",
  requirePermission('employees', 'assign_department'),
  validate(assignDeptSchema),
  controller.assignDepartment
);

// ASSIGN DESIGNATION
router.put(
  "/:id/designation",
  requirePermission('employees', 'assign_designation'),
  validate(assignDesignationSchema),
  controller.assignDesignation
);

// TERMINATE
router.post(
  "/:id/terminate",
  requirePermission('employees', 'terminate'),
  controller.terminateEmployee
);

// DELETE (Soft Delete)
router.delete(
  "/:id",
  requirePermission('employees', 'delete'),
  controller.softDeleteUser
);

// =====================
// SELF-SERVICE ROUTES (any authenticated user)
// =====================
const selfService = express.Router();
selfService.use(verifyJwt);

selfService.get("/me/profile", controller.getMyProfile);
selfService.put("/me/profile", controller.updateMyProfile);
selfService.get("/me/reveal", controller.revealOwnSensitiveField);

// Profile photo
const uploadPhoto = require("multer")({
  storage: require("multer").memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
selfService.post("/me/photo", uploadPhoto.single("photo"), controller.uploadProfilePhoto);
selfService.delete("/me/photo", controller.removeProfilePhoto);

// Export both routers
router.selfService = selfService;
module.exports = router;
