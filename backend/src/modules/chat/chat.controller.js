const chatService = require("./chat.service");

exports.getConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations(req.db, req.user.id, req.user.tenantId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit, offset } = req.query;
    const data = await chatService.getMessages(req.db, conversationId, req.user.id, limit, offset);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type, fileUrl } = req.body;
    const data = await chatService.sendMessage(
      req.db,
      req.user.id,
      req.user.tenantId,
      conversationId,
      content,
      type,
      fileUrl
    );
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.startDirectChat = async (req, res) => {
  try {
    const { userId } = req.body; // Target user
    const data = await chatService.createDirectConversation(req.db, req.user.id, userId, req.user.tenantId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    console.log(`[ChatController] Fetching contacts for user ${req.user.id}, tenant ${req.user.tenantId}`);
    const data = await chatService.getContacts(req.db, req.user.id, req.user.tenantId);
    console.log(`[ChatController] Found ${data.length} contacts`);
    res.json({ status: "success", data });
  } catch (err) {
    console.error(`[ChatController] Error fetching contacts:`, err);
    res.status(400).json({ status: "error", message: err.message });
  }
}

exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await chatService.markAsRead(req.db, conversationId, req.user.id);
    res.json({ status: "success" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.logCall = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { callType, duration, status } = req.body;
    const data = await chatService.logCall(req.db, req.user.id, req.user.tenantId, conversationId, callType, duration, status);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    // In a real app, this would be an S3 URL. For now, we'll return a local path.
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ status: "success", data: { fileUrl } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};
