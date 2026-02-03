const router = require("express").Router();
const controller = require("./chat.controller");
const verifyJwt = require("../../middleware/verifyJwt");
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

router.get("/conversations", controller.getConversations);
router.get("/conversations/:conversationId/messages", controller.getMessages);
router.post("/conversations/:conversationId/messages", controller.sendMessage);
router.post("/conversations/direct", controller.startDirectChat);
router.get("/contacts", controller.getContacts);

// New Routes
router.post("/upload", upload.single("file"), controller.uploadFile);
router.post("/conversations/:conversationId/read", controller.markAsRead);
router.post("/conversations/:conversationId/log-call", controller.logCall);

module.exports = router;
