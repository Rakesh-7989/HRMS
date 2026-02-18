const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./delegation.controller");
const v = require("./delegation.validator");

router.use(verifyJwt);

router.post("/", requireAnyPermission(["leave.manage_settings", "leave.approve"]), validate(v.createDelegationSchema), controller.createDelegation);
router.get("/my", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.getMyDelegations);
router.get("/to-me", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.getDelegationsToMe);
router.delete("/:id", requireAnyPermission(["leave.manage_settings", "leave.approve"]), controller.revokeDelegation);
router.get("/all", requireAnyPermission(["leave.manage_settings"]), controller.getAllDelegations);

module.exports = router;
