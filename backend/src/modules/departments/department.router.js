const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");

const controller = require("./department.controller");
const validator = require("./department.validator");

router.use(verifyJwt);

// ADMIN + HR
router.post(
  "/",
  requireRole(["ADMIN", "HR"]),
  validate(validator.createDepartmentSchema),
  controller.createDepartment
);

router.get(
  "/",
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(validator.getDepartmentSchema),
  controller.getDepartments
);

router.get(
  "/:id",
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  controller.getDepartmentById
);

router.patch(
  "/:id",
  requireRole(["ADMIN", "HR"]),
  validate(validator.updateDepartmentSchema),
  controller.updateDepartment
);

// ADMIN + HR (Updated to allow HR to delete)
router.delete(
  "/:id",
  requireRole(["ADMIN", "HR"]),
  validate(validator.deleteDepartmentSchema),
  controller.deleteDepartment
);

module.exports = router;
