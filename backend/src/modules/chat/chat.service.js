const pool = require("../../config/db");
const { getIo } = require("../../config/socket");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../../utils/customErrors");

const queryDb = (req) =>
  req && req.query ? req.query : pool.query.bind(pool);

exports.getConversations = async (db, userId, tenantId) => {
  const query = queryDb(db);

  // Get all conversations for user
  const res = await query(
    `
    SELECT 
      c.id, 
      c.type, 
      c.name, 
      c.updated_at,
      cp.joined_at,
      cp.unread_count,
      (
        SELECT json_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at, 'sender_id', m.sender_id, 'type', m.type, 'file_url', m.file_url) 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC LIMIT 1
      ) as last_message,
      (
        SELECT json_agg(json_build_object('id', u.id, 'email', u.email, 'first_name', emp.first_name, 'last_name', emp.last_name))
        FROM conversation_participants part
        JOIN users u ON part.user_id = u.id
        LEFT JOIN employees emp ON u.id = emp.user_id
        WHERE part.conversation_id = c.id AND part.user_id != $1
      ) as participants
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = $1 AND c.tenant_id = $2
    ORDER BY c.updated_at DESC
    `,
    [userId, tenantId]
  );

  return res.rows;
};

exports.getMessages = async (db, conversationId, userId, limit = 50, offset = 0) => {
  const query = queryDb(db);

  // Verify participation
  const partRes = await query(
    `SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2`,
    [conversationId, userId]
  );

  if (partRes.rowCount === 0) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  const res = await query(
    `
    SELECT 
      m.*,
      u.email as sender_email,
      e.first_name as sender_first_name,
      e.last_name as sender_last_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [conversationId, limit, offset]
  );

  return res.rows.reverse(); // Return in chronological order
};

exports.sendMessage = async (db, senderId, tenantId, conversationId, content, type = 'TEXT', fileUrl = null) => {
  const query = queryDb(db);

  // Verify participation
  const partRes = await query(
    `SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2`,
    [conversationId, senderId]
  );

  if (partRes.rowCount === 0) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  // Insert message
  const res = await query(
    `
    INSERT INTO messages (conversation_id, sender_id, content, type, file_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [conversationId, senderId, content, type, fileUrl]
  );

  const message = res.rows[0];

  // Update conversation updated_at
  await query(`UPDATE conversations SET updated_at = NOW() WHERE id=$1`, [conversationId]);

  // Increment unread_count for other participants
  await query(
    `UPDATE conversation_participants SET unread_count = unread_count + 1 WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
  );

  // Real-time broadcast
  try {
    const io = getIo();
    io.to(conversationId).emit("receive_message", message);

    // Fetch all participants to notify them via their individual user rooms
    const participants = await query(`SELECT user_id FROM conversation_participants WHERE conversation_id = $1`, [conversationId]);

    participants.rows.forEach(p => {
      // Notify recipients of new unread count via their private user rooms
      if (p.user_id !== senderId) {
        io.to(`user_${p.user_id}`).emit("unread_update", { conversationId, senderId });
      }
    });
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  return message;
};

exports.markAsRead = async (db, conversationId, userId) => {
  const query = queryDb(db);
  await query(
    `UPDATE conversation_participants SET unread_count = 0 WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return { success: true };
};

exports.logCall = async (db, senderId, tenantId, conversationId, callType, duration, status) => {
  const content = JSON.stringify({ callType, duration, status });
  return await exports.sendMessage(db, senderId, tenantId, conversationId, content, 'CALL');
};

exports.createDirectConversation = async (db, user1, user2, tenantId) => {
  const query = queryDb(db);

  // Check if DM already exists
  const existing = await query(
    `
    SELECT c.id 
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'DIRECT' 
      AND c.tenant_id = $1
      AND cp1.user_id = $2 
      AND cp2.user_id = $3
    LIMIT 1
    `,
    [tenantId, user1, user2]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  // Start Transaction if possible (simplified here)
  const convRes = await query(
    `INSERT INTO conversations (type, tenant_id) VALUES ('DIRECT', $1) RETURNING id`,
    [tenantId]
  );
  const conversationId = convRes.rows[0].id;

  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [conversationId, user1, user2]
  );

  return { id: conversationId };
};

exports.getContacts = async (db, userId, tenantId) => {
  const query = queryDb(db);
  console.log(`[ChatService] Querying contacts for tenant ${tenantId}, excluding user ${userId}`);
  // Get all other users in the same tenant
  const res = await query(`
        SELECT u.id, u.email, e.first_name, e.last_name, d.name as designation
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN designations d ON e.designation_id = d.id
        WHERE u.tenant_id = $1 AND u.id != $2 AND u.is_active = true
    `, [tenantId, userId]);
  return res.rows;
}
