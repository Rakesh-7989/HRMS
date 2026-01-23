
const router = require("express").Router();
const controller = require("./tenant.controller");
const validate = require("../../middleware/validate");
const { tenantRegisterSchema } = require("./tenant.validator");

router.post("/register", validate(tenantRegisterSchema), controller.registerTenant);

module.exports = router;
