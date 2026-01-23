const router = require("express").Router();
const controller = require("./documents.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");

router.use(verifyJwt);

router.get("/employee/:employeeId", controller.getDocuments);
router.post("/employee/:employeeId", requireRole(["ADMIN", "HR"]), controller.uploadDocument);
router.delete("/:id", requireRole(["ADMIN", "HR"]), controller.deleteDocument);

module.exports = router;
