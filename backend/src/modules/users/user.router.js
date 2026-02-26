const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const { checkLimit } = require("../../middleware/subscription.middleware");

const {
  createUserSchema,
  getUsersSchema,
  updateUserSchema,
  updateEmployeeSchema,
  updateProfileSchema,
  changeRoleSchema,
  changeManagerSchema,
  assignDeptSchema,
  assignDesignationSchema,
  statusSchema,
  terminateSchema,
  rehireSchema,
  getUserSchema,
  deleteUserSchema,
} = require("./user.validator");

// Create new user (Admin / HR)
router.post(
  "/",
  verifyJwt,
  requireAnyPermission(["create_employee", "manage_all_employees"]),
  checkLimit('employees'),
  validate(createUserSchema),
  controller.createUser
);

// Get all users
router.get(
  "/",
  verifyJwt,
  requireAnyPermission(["view_all_employees", "manage_all_employees"]),
  validate(getUsersSchema),
  controller.getUsers
);

// Organization Tree
router.get("/tree", verifyJwt, controller.getOrgTree);

// Get user by ID
router.get(
  "/:id",
  verifyJwt,
  requireAnyPermission(["view_all_employees", "view_team_employees", "manage_all_employees"]),
  validate(getUserSchema),
  controller.getUserById
);

// Update user
router.put(
  "/:id",
  verifyJwt,
  requireAnyPermission(["edit_employee", "manage_all_employees"]),
  validate(updateUserSchema),
  controller.updateUser
);

// UPDATE EMPLOYEE DETAILS
router.put(
  "/:id/employee",
  verifyJwt,
  requirePermission("edit_employee"),
  validate(updateEmployeeSchema),
  controller.updateEmployee
);

// CHANGE ROLE
router.put(
  "/:id/role",
  verifyJwt,
  requirePermission("assign_roles"),
  validate(changeRoleSchema),
  controller.changeRole
);

// CHANGE REPORTING MANAGER
router.put(
  "/:id/manager",
  verifyJwt,
  requirePermission("edit_employee"),
  validate(changeManagerSchema),
  controller.changeManager
);

router.put(
  "/:id/department",
  verifyJwt,
  requirePermission("manage_departments"),
  validate(assignDeptSchema),
  controller.assignDepartment
);

// ASSIGN DESIGNATION
router.put(
  "/:id/designation",
  verifyJwt,
  requirePermission("manage_designations"),
  validate(assignDesignationSchema),
  controller.assignDesignation
);

// TERMINATE EMPLOYEE
router.post(
  "/:id/terminate",
  verifyJwt,
  requirePermission("delete_employee"),
  validate(terminateSchema),
  controller.terminateEmployee
);

// REHIRE EMPLOYEE
router.post(
  "/:id/rehire",
  verifyJwt,
  requirePermission("edit_employee"),
  validate(rehireSchema),
  controller.rehireEmployee
);

// SOFT DELETE
router.delete(
  "/:id",
  verifyJwt,
  requirePermission("delete_employee"),
  validate(deleteUserSchema),
  controller.softDeleteUser
);

// TOGGLE ACTIVE STATUS
router.put(
  "/:id/status",
  verifyJwt,
  requirePermission("edit_employee"),
  validate(statusSchema),
  controller.updateUserStatus
);

// Export both routers
module.exports = router;
module.exports.selfService = express.Router();

// Self-service routes (no role restrictions)
const selfRouter = module.exports.selfService;
selfRouter.get("/me/profile", verifyJwt, controller.getMyProfile);
selfRouter.put(
  "/me/profile",
  verifyJwt,
  validate(updateProfileSchema),
  controller.updateMyProfile
);
