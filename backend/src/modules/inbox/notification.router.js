const router = require("express").Router();
const controller = require("../inbox/inbox.controller");
const verifyJwt = require("../../middleware/verifyJwt");

router.use(verifyJwt);

router.get("/", controller.getNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/mark-all-read", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;
