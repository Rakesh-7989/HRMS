const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const validate = require("../../middleware/validate");

const controller = require("./department.controller");
const validator = require("./department.validator");

router.use(verifyJwt);

// ADMIN + HR
router.post(
  "/",
  requireAnyPermission(["manage_departments"]),
  validate(validator.createDepartmentSchema),
  controller.createDepartment
);

router.get(
  "/",
  requireAnyPermission(["view_organization_structure"]),
  validate(validator.getDepartmentSchema),
  controller.getDepartments
);

router.get(
  "/:id",
  requireAnyPermission(["view_organization_structure"]),
  controller.getDepartmentById
);

router.patch(
  "/:id",
  requireAnyPermission(["manage_departments"]),
  validate(validator.updateDepartmentSchema),
  controller.updateDepartment
);

// ADMIN + HR (Updated to allow HR to delete)
router.delete(
  "/:id",
  requireAnyPermission(["manage_departments"]),
  validate(validator.deleteDepartmentSchema),
  controller.deleteDepartment
);

module.exports = router;
