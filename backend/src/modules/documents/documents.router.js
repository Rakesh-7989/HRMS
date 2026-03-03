const router = require("express").Router();
const controller = require("./documents.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");

router.use(verifyJwt);

router.get("/employee/:employeeId", requirePermission("documents", "view"), controller.getDocuments);
router.post("/employee/:employeeId", requirePermission("documents", "upload"), controller.uploadDocument);
router.delete("/:id", requirePermission("documents", "delete"), controller.deleteDocument);

module.exports = router;
