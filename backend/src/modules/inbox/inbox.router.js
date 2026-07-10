const router = require("express").Router();
const controller = require("./inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");

router.use(verifyJwt);

// GET TASKS (All if Admin/HR, own if Employee - handled in logic, but 'view' permission required)
router.get("/", requirePermission("tasks", "view"), controller.getTasks);

// CREATE TASK
router.post("/", requirePermission("tasks", "create"), controller.createTask);

// UPDATE STATUS
router.put("/:id/status", requirePermission("tasks", "manage_status"), controller.updateTaskStatus);

// GET ACTIVITIES (Replies)
router.get("/:id/activities", requirePermission("tasks", "view"), controller.getActivities);

// ADD ACTIVITY (Reply)
router.post("/:id/activities", requirePermission("tasks", "manage_activities"), controller.addActivity);

// NOTIFICATIONS (Standard paths used by notificationsService - usually just 'view' or no specific permission beyond auth)
router.get("/unread-count", controller.getUnreadCount);
router.patch("/mark-all-read", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;
