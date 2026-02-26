const router = require("express").Router();
const controller = require("./documents.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

router.use(verifyJwt);

router.get("/employee/:employeeId", controller.getDocuments);
router.post("/employee/:employeeId", requireAnyPermission(["manage_employee_docs"]), controller.uploadDocument);
router.delete("/:id", requireAnyPermission(["manage_employee_docs"]), controller.deleteDocument);

module.exports = router;
