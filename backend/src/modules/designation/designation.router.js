const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");

const controller = require("./designation.controller");
const validator = require("./designation.validator");

router.use(verifyJwt);

const requirePermission = require("../../middleware/requirePermission");

router.use(verifyJwt);

router.post(
  "/",
  requirePermission("designations", "manage"),
  validate(validator.createDesignationSchema),
  controller.createDesignation
);

router.get(
  "/",
  requirePermission("designations", "view"),
  validate(validator.getDesignationSchema),
  controller.getDesignations
);

router.get(
  "/:id",
  requirePermission("designations", "view"),
  controller.getDesignationById
);

router.patch(
  "/:id",
  requirePermission("designations", "manage"),
  validate(validator.updateDesignationSchema),
  controller.updateDesignation
);

router.delete(
  "/:id",
  requirePermission("designations", "manage"),
  validate(validator.deleteDesignationSchema),
  controller.deleteDesignation
);

module.exports = router;
