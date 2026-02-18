const router = require("express").Router();
const controller = require("./inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

router.use(verifyJwt);

// GET TASKS (All if Admin/HR, own if Employee)
router.get("/", controller.getTasks);

// CREATE TASK (Admin/HR only usually, but maybe managers too)
router.post("/", requireAnyPermission(["notifications.view", "notifications.view"]), controller.createTask);

// UPDATE STATUS
router.put("/:id/status", controller.updateTaskStatus);

// GET ACTIVITIES (Replies)
router.get("/:id/activities", controller.getActivities);

// ADD ACTIVITY (Reply)
router.post("/:id/activities", controller.addActivity);

// NOTIFICATIONS (Standard paths used by notificationsService)
router.get("/unread-count", controller.getUnreadCount);
router.patch("/mark-all-read", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;
