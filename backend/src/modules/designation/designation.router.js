const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const validate = require("../../middleware/validate");

const controller = require("./designation.controller");
const validator = require("./designation.validator");

router.use(verifyJwt);

router.post(
  "/",
  requireAnyPermission(["manage_designations"]),
  validate(validator.createDesignationSchema),
  controller.createDesignation
);

router.get(
  "/",
  requireAnyPermission(["view_organization_structure"]),
  validate(validator.getDesignationSchema),
  controller.getDesignations
);

router.get(
  "/:id",
  requireAnyPermission(["manage_designations"]),
  controller.getDesignationById
);

router.patch(
  "/:id",
  requireAnyPermission(["manage_designations"]),
  validate(validator.updateDesignationSchema),
  controller.updateDesignation
);

router.delete(
  "/:id",
  requireAnyPermission(["manage_designations"]),
  validate(validator.deleteDesignationSchema),
  controller.deleteDesignation
);

module.exports = router;
