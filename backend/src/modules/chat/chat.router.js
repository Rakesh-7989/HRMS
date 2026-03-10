const router = require("express").Router();
const controller = require("./chat.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../../uploads/chat");
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

router.use(verifyJwt);

// Unified permission bypass for management
const canManage = ["manage"];

router.get("/conversations", requirePermission("chat", ["view", ...canManage]), controller.getConversations);
router.get("/conversations/:conversationId", requirePermission("chat", ["view", ...canManage]), controller.getConversation);
router.get("/conversations/:conversationId/messages", requirePermission("chat", ["view", ...canManage]), controller.getMessages);
router.post("/conversations/:conversationId/messages", requirePermission("chat", ["send", ...canManage]), controller.sendMessage);
router.post("/conversations/direct", requirePermission("chat", ["send", ...canManage]), controller.startDirectChat);
router.put("/conversations/:conversationId/messages/:messageId", requirePermission("chat", ["edit_messages", ...canManage]), controller.updateMessage);
router.delete("/conversations/:conversationId/messages/:messageId", requirePermission("chat", ["delete_messages", ...canManage]), controller.deleteMessage);

router.get("/contacts", requirePermission("chat", ["view", ...canManage]), controller.getContacts);

// New Routes
router.post("/upload", requirePermission("chat", ["send", ...canManage]), upload.single("file"), controller.uploadFile);
router.post("/conversations/:conversationId/read", requirePermission("chat", ["view", ...canManage]), controller.markAsRead);
router.post("/conversations/:conversationId/log-call", requirePermission("chat", ["voice_call", "video_call", ...canManage]), controller.logCall);

// Advanced Features
router.post("/groups", requirePermission("chat", ["create_group", ...canManage]), controller.createGroupConversation);
router.post("/conversations/:conversationId/participants", requirePermission("chat", ["manage_group", ...canManage]), controller.addParticipants);
router.delete("/conversations/:conversationId/participants/:userId", requirePermission("chat", ["manage_group", ...canManage]), controller.removeParticipant);
router.post("/status", requirePermission("chat", ["view", ...canManage]), controller.updateStatus);
router.post("/status-message", requirePermission("chat", ["view", ...canManage]), controller.setStatusMessage);
router.get("/search", requirePermission("chat", ["view", ...canManage]), controller.searchGlobal);
router.get("/messages/:messageId/thread", requirePermission("chat", ["view", ...canManage]), controller.getThread);

router.post("/conversations/:conversationId/messages/:messageId/reactions", requirePermission("chat", ["send", ...canManage]), controller.addReaction);
router.delete("/conversations/:conversationId/messages/:messageId/reactions", requirePermission("chat", ["send", ...canManage]), controller.removeReaction);
router.post("/conversations/:conversationId/messages/:messageId/toggle-pin", requirePermission("chat", ["manage_group", ...canManage]), controller.togglePin);

router.delete("/conversations/:conversationId/clear", requirePermission("chat", ["delete_messages", ...canManage]), controller.clearChatHistory);
router.delete("/conversations/:conversationId", requirePermission("chat", ["manage", ...canManage]), controller.deleteConversation);

module.exports = router;
