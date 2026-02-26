const router = require("express").Router();
const controller = require("./chat.controller");
const verifyJwt = require("../../middleware/verifyJwt");
const multer = require("multer");
const path = require("path");
const { requirePermission } = require("../../middleware/requirePermission");

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
router.use(requirePermission("access_chat"));

router.get("/conversations", controller.getConversations);
router.get("/conversations/:conversationId", controller.getConversation);
router.get("/conversations/:conversationId/messages", controller.getMessages);
router.post("/conversations/:conversationId/messages", controller.sendMessage);
router.post("/conversations/direct", controller.startDirectChat);
router.put("/conversations/:conversationId/messages/:messageId", controller.updateMessage);
router.delete("/conversations/:conversationId/messages/:messageId", controller.deleteMessage);

router.get("/contacts", controller.getContacts);

// New Routes
router.post("/upload", upload.single("file"), controller.uploadFile);
router.post("/conversations/:conversationId/read", controller.markAsRead);
router.post("/conversations/:conversationId/log-call", controller.logCall);

// Advanced Features
router.post("/groups", controller.createGroupConversation);
router.post("/status", controller.updateStatus);
router.get("/search", controller.searchGlobal);
router.get("/messages/:messageId/thread", controller.getThread);

router.post("/conversations/:conversationId/messages/:messageId/reactions", controller.addReaction);
router.delete("/conversations/:conversationId/messages/:messageId/reactions", controller.removeReaction);
router.post("/conversations/:conversationId/messages/:messageId/toggle-pin", controller.togglePin);

module.exports = router;
