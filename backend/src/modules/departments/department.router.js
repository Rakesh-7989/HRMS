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
  requireAnyPermission(["organisation.manage_departments"]),
  validate(validator.createDepartmentSchema),
  controller.createDepartment
);

router.get(
  "/",
  requireAnyPermission(["organisation.view"]),
  validate(validator.getDepartmentSchema),
  controller.getDepartments
);

router.get(
  "/:id",
  requireAnyPermission(["organisation.view"]),
  controller.getDepartmentById
);

router.patch(
  "/:id",
  requireAnyPermission(["organisation.manage_departments"]),
  validate(validator.updateDepartmentSchema),
  controller.updateDepartment
);

// ADMIN + HR (Updated to allow HR to delete)
router.delete(
  "/:id",
  requireAnyPermission(["organisation.manage_departments"]),
  validate(validator.deleteDepartmentSchema),
  controller.deleteDepartment
);

module.exports = router;
