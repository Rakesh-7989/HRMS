const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
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
  statusSchema
} = require("./user.validator");

const uploadTemp = require("multer")({ storage: require("multer").memoryStorage() });

// CREATE EMPLOYEE (Admin + HR)
router.post(
  "/",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  checkLimit('employees'),
  validate(createUserSchema),
  controller.createUser
);

// BULK IMPORT EMPLOYEES
router.post(
  "/bulk-import",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  checkLimit('employees'),
  uploadTemp.single("file"),
  controller.bulkImportEmployees
);

// LIST EMPLOYEES / USERS
router.get(
  "/",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(getUsersSchema),
  controller.getUsers
);

// Organization Tree
router.get("/tree", verifyJwt, controller.getOrgTree);

// GET USER BY ID
router.get("/:id", verifyJwt, requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]), controller.getUserById);

// UPDATE BASIC USER (email + status)
router.put(
  "/:id",
  verifyJwt,
  validate(updateUserSchema),
  controller.updateUser
);

// UPDATE EMPLOYEE DETAILS
router.put(
  "/:id/employee",
  verifyJwt,
  validate(updateEmployeeSchema),
  controller.updateEmployee
);

// CHANGE ROLE
router.put(
  "/:id/role",
  verifyJwt,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  validate(changeRoleSchema),
  controller.changeRole
);

// CHANGE REPORTING MANAGER (Only HR can assign managers)
router.put(
  "/:id/manager",
  verifyJwt,
  requireRole(["HR"]),
  validate(changeManagerSchema),
  controller.changeManager
);

router.put(
  "/:id/department",
  verifyJwt,
  validate(assignDeptSchema),
  controller.assignDepartment
);

// ASSIGN DESIGNATION
router.put(
  "/:id/designation",
  verifyJwt,
  validate(assignDesignationSchema),
  controller.assignDesignation
);

// TERMINATE EMPLOYEE
router.post(
  "/:id/terminate",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  controller.terminateEmployee
);

// REHIRE EMPLOYEE
router.post(
  "/:id/rehire",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  controller.rehireEmployee
);

// SOFT DELETE
router.delete(
  "/:id",
  verifyJwt,
  requireRole(["ADMIN"]),
  controller.softDeleteUser
);

// TOGGLE ACTIVE STATUS
router.put(
  "/:id/status",
  verifyJwt,
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

const upload = require("../../middleware/upload");

selfRouter.post(
  "/me/profile-photo",
  verifyJwt,
  (req, res, next) => {
    console.log("[Router Debug] HIT /me/profile-photo");
    console.log("[Router Debug] Headers:", req.headers['content-type']);
    next();
  },
  upload.single('photo'),
  controller.uploadProfilePhoto
);

selfRouter.delete(
  "/me/profile-photo",
  verifyJwt,
  controller.removeProfilePhoto
);
