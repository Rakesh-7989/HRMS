const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./delegation.controller");
const v = require("./delegation.validator");

router.use(verifyJwt);

router.post("/", requireRole(["MANAGER", "HR", "ADMIN"]), validate(v.createDelegationSchema), controller.createDelegation);
router.get("/my", requireRole(["MANAGER", "HR", "ADMIN"]), controller.getMyDelegations);
router.get("/to-me", requireRole(["MANAGER", "HR", "ADMIN"]), controller.getDelegationsToMe);
router.delete("/:id", requireRole(["MANAGER", "HR", "ADMIN"]), controller.revokeDelegation);
router.get("/all", requireRole(["ADMIN", "HR"]), controller.getAllDelegations);

module.exports = router;
