const router = require("express").Router();
const controller = require("../inbox/inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission } = require("../../middleware/requirePermission");

router.use(verifyJwt);

router.get("/", requirePermission("view_notifications"), controller.getNotifications);
router.get("/unread-count", requirePermission("view_notifications"), controller.getUnreadCount);
router.patch("/mark-all-read", requirePermission("view_notifications"), controller.markAllAsRead);
router.patch("/:id/read", requirePermission("view_notifications"), controller.markAsRead);
router.delete("/:id", requirePermission("view_notifications"), controller.deleteNotification);

module.exports = router;
