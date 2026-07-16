const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");

const controller = require("./department.controller");
const validator = require("./department.validator");

router.use(verifyJwt);

const requirePermission = require("../../middleware/requirePermission");

router.use(verifyJwt);

// Create department
router.post(
  "/",
  requirePermission("departments", "manage"),
  validate(validator.createDepartmentSchema),
  controller.createDepartment
);

// View departments
router.get(
  "/",
  requirePermission("departments", "view"),
  validate(validator.getDepartmentSchema),
  controller.getDepartments
);

router.get(
  "/:id",
  requirePermission("departments", "view"),
  controller.getDepartmentById
);

// Update department
router.patch(
  "/:id",
  requirePermission("departments", "manage"),
  validate(validator.updateDepartmentSchema),
  controller.updateDepartment
);

// Delete department
router.delete(
  "/:id",
  requirePermission("departments", "manage"),
  validate(validator.deleteDepartmentSchema),
  controller.deleteDepartment
);

module.exports = router;
