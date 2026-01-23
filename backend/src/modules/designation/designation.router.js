const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");

const controller = require("./designation.controller");
const validator = require("./designation.validator");

router.use(verifyJwt);

router.post(
  "/",
  requireRole(["ADMIN", "HR"]),
  validate(validator.createDesignationSchema),
  controller.createDesignation
);

router.get(
  "/",
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(validator.getDesignationSchema),
  controller.getDesignations
);

router.get(
  "/:id",
  requireRole(["ADMIN", "HR"]),
  controller.getDesignationById
);

router.patch(
  "/:id",
  requireRole(["ADMIN", "HR"]),
  validate(validator.updateDesignationSchema),
  controller.updateDesignation
);

router.delete(
  "/:id",
  requireRole(["ADMIN", "HR"]),
  validate(validator.deleteDesignationSchema),
  controller.deleteDesignation
);

module.exports = router;
