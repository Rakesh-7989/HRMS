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

// CREATE EMPLOYEE
router.post(
  "/",
  verifyJwt,
  requirePermission("employees.create"),
  checkLimit('employees'),
  validate(createUserSchema),
  controller.createUser
);

// LIST EMPLOYEES / USERS
router.get(
  "/",
  verifyJwt,
  requireAnyPermission(["employees.view", "employees.edit"]),
  validate(getUsersSchema),
  controller.getUsers
);

// Organization Tree
router.get("/tree", verifyJwt, controller.getOrgTree);

// GET USER BY ID
router.get(
  "/:id",
  verifyJwt,
  requirePermission("employees.view"),
  validate(getUserSchema),
  controller.getUserById
);

// UPDATE BASIC USER (email + status)
router.put(
  "/:id",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(updateUserSchema),
  controller.updateUser
);

// UPDATE EMPLOYEE DETAILS
router.put(
  "/:id/employee",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(updateEmployeeSchema),
  controller.updateEmployee
);

// CHANGE ROLE
router.put(
  "/:id/role",
  verifyJwt,
  requirePermission("roles.assign"),
  validate(changeRoleSchema),
  controller.changeRole
);

// CHANGE REPORTING MANAGER
router.put(
  "/:id/manager",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(changeManagerSchema),
  controller.changeManager
);

router.put(
  "/:id/department",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(assignDeptSchema),
  controller.assignDepartment
);

// ASSIGN DESIGNATION
router.put(
  "/:id/designation",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(assignDesignationSchema),
  controller.assignDesignation
);

// TERMINATE EMPLOYEE
router.post(
  "/:id/terminate",
  verifyJwt,
  requirePermission("employees.delete"),
  validate(terminateSchema),
  controller.terminateEmployee
);

// REHIRE EMPLOYEE
router.post(
  "/:id/rehire",
  verifyJwt,
  requirePermission("employees.edit"),
  validate(rehireSchema),
  controller.rehireEmployee
);

// SOFT DELETE
router.delete(
  "/:id",
  verifyJwt,
  requirePermission("employees.delete"),
  validate(deleteUserSchema),
  controller.softDeleteUser
);

// TOGGLE ACTIVE STATUS
router.put(
  "/:id/status",
  verifyJwt,
  requirePermission("employees.edit"),
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
