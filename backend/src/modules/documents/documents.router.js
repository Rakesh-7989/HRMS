const router = require("express").Router();
const controller = require("./documents.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

router.use(verifyJwt);

router.get("/employee/:employeeId", controller.getDocuments);
router.post("/employee/:employeeId", requireAnyPermission(["employees.manage_docs"]), controller.uploadDocument);
router.delete("/:id", requireAnyPermission(["employees.manage_docs"]), controller.deleteDocument);

module.exports = router;
