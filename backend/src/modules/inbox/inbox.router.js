const router = require("express").Router();
const controller = require("./inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");

router.use(verifyJwt);

// GET TASKS (All if Admin/HR, own if Employee)
router.get("/", controller.getTasks);

// CREATE TASK (Admin/HR only usually, but maybe managers too)
router.post("/", requireRole(["ADMIN", "HR", "MANAGER"]), controller.createTask);

// UPDATE STATUS
router.put("/:id/status", controller.updateTaskStatus);

// GET ACTIVITIES (Replies)
router.get("/:id/activities", controller.getActivities);

// ADD ACTIVITY (Reply)
router.post("/:id/activities", controller.addActivity);

module.exports = router;
