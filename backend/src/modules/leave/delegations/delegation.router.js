const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");

const controller = require("./delegation.controller");
const v = require("./delegation.validator");

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

router.post("/", validate(v.createDelegationSchema), controller.createDelegation);
router.get("/my", controller.getMyDelegations);
router.get("/to-me", controller.getDelegationsToMe);
router.delete("/:id", controller.revokeDelegation);
router.get("/all", requirePermission("leave", "view"), controller.getAllDelegations);

module.exports = router;
