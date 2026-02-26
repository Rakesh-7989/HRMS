const router = require("express").Router();
const controller = require("./inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

router.use(verifyJwt);

// GET TASKS (All if Admin/HR, own if Employee)
router.get("/", requireAnyPermission(["view_notifications", "manage_tasks"]), controller.getTasks);

// CREATE TASK (Admin/HR only usually, but maybe managers too)
router.post("/", requirePermission("manage_tasks"), controller.createTask);

// UPDATE STATUS
router.put("/:id/status", requirePermission("manage_tasks"), controller.updateTaskStatus);

// GET ACTIVITIES (Replies)
router.get("/:id/activities", requireAnyPermission(["view_notifications", "manage_tasks"]), controller.getActivities);

// ADD ACTIVITY (Reply)
router.post("/:id/activities", requireAnyPermission(["view_notifications", "manage_tasks"]), controller.addActivity);

// NOTIFICATIONS (Standard paths used by notificationsService)
router.get("/unread-count", requirePermission("view_notifications"), controller.getUnreadCount);
router.patch("/mark-all-read", requirePermission("view_notifications"), controller.markAllAsRead);
router.patch("/:id/read", requirePermission("view_notifications"), controller.markAsRead);
router.delete("/:id", requirePermission("view_notifications"), controller.deleteNotification);

module.exports = router;
