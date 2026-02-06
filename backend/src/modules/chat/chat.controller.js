const chatService = require("./chat.service");

exports.getConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations(req.db, req.user.id, req.user.tenantId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const data = await chatService.getConversation(req.db, conversationId, req.user.id);
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
      fileUrl,
      req.body.parentId // New: parentId for threading
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
    console.error("[ChatController] startDirectChat Error:", err);
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;
    const data = await chatService.updateMessage(req.db, req.user.id, conversationId, messageId, content);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    await chatService.deleteMessage(req.db, req.user.id, conversationId, messageId);
    res.json({ status: "success" });
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

exports.createGroupConversation = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const data = await chatService.createGroupConversation(req.db, req.user.id, req.user.tenantId, name, participantIds);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params; // conversationId for route consistency, primarily using messageId
    const { emoji } = req.body;
    const data = await chatService.addReaction(req.db, messageId, req.user.id, emoji);

    // Socket notify
    const io = require("../../config/socket").getIo();
    io.to(conversationId).emit("reaction_added", data);

    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;
    const data = await chatService.removeReaction(req.db, messageId, req.user.id, emoji);

    // Socket notify
    const io = require("../../config/socket").getIo();
    io.to(conversationId).emit("reaction_removed", data);

    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const data = await chatService.updateUserStatus(req.db, req.user.id, status);

    // Broadcast status change globally to the tenant
    const io = require("../../config/socket").getIo();
    io.to(`tenant_${req.user.tenantId}`).emit('user_status_change', { userId: req.user.id, status });

    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.searchGlobal = async (req, res) => {
  try {
    const { q } = req.query;
    const data = await chatService.searchGlobal(req.db, req.user.tenantId, q);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getThread = async (req, res) => {
  try {
    const { messageId } = req.params;
    const data = await chatService.getThreadMessages(req.db, messageId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.togglePin = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const data = await chatService.togglePinMessage(req.db, conversationId, messageId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};
