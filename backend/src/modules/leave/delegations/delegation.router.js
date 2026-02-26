const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./delegation.controller");
const v = require("./delegation.validator");

router.use(verifyJwt);

router.post("/", requireAnyPermission(["manage_leave_policies", "approve_leave"]), validate(v.createDelegationSchema), controller.createDelegation);
router.get("/my", requireAnyPermission(["manage_leave_policies", "approve_leave"]), controller.getMyDelegations);
router.get("/to-me", requireAnyPermission(["manage_leave_policies", "approve_leave"]), controller.getDelegationsToMe);
router.delete("/:id", requireAnyPermission(["manage_leave_policies", "approve_leave"]), controller.revokeDelegation);
router.get("/all", requireAnyPermission(["manage_leave_policies"]), controller.getAllDelegations);

module.exports = router;
