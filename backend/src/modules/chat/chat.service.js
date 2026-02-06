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
        SELECT json_build_object(
          'id', m.id, 
          'content', m.content, 
          'created_at', m.created_at, 
          'sender_id', m.sender_id, 
          'type', m.type, 
          'file_url', m.file_url,
          'parent_id', m.parent_id
        ) 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC LIMIT 1
      ) as last_message,
      (
        SELECT json_agg(json_build_object('id', u.id, 'email', u.email, 'first_name', emp.first_name, 'last_name', emp.last_name, 'status', u.status))
        FROM conversation_participants part
        JOIN users u ON part.user_id = u.id
        LEFT JOIN employees emp ON u.id = emp.user_id
        WHERE part.conversation_id = c.id AND part.user_id != $1
      ) as participants
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = $1 AND c.tenant_id = $2
      AND (c.type = 'GROUP' OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id))
    ORDER BY c.updated_at DESC
    `,
    [userId, tenantId]
  );

  return res.rows;
};

exports.getConversation = async (db, conversationId, userId) => {
  const query = queryDb(db);

  const res = await query(
    `
    SELECT 
      c.id, 
      c.type, 
      c.name, 
      c.updated_at,
      cp.unread_count,
      (
        SELECT json_agg(json_build_object('id', u.id, 'email', u.email, 'first_name', emp.first_name, 'last_name', emp.last_name, 'status', u.status))
        FROM conversation_participants part
        JOIN users u ON part.user_id = u.id
        LEFT JOIN employees emp ON u.id = emp.user_id
        WHERE part.conversation_id = c.id AND part.user_id != $2
      ) as participants
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE c.id = $1 AND cp.user_id = $2
    `,
    [conversationId, userId]
  );

  return res.rows[0];
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
      e.last_name as sender_last_name,
      (
        SELECT json_agg(json_build_object('id', mr.id, 'user_id', mr.user_id, 'emoji', mr.emoji))
        FROM message_reactions mr
        WHERE mr.message_id = m.id
      ) as reactions,
      m.parent_id,
       (
        SELECT json_build_object('content', pm.content, 'sender_first_name', pe.first_name)
        FROM messages pm
        LEFT JOIN users pu ON pm.sender_id = pu.id
        LEFT JOIN employees pe ON pu.id = pe.user_id
        WHERE pm.id = m.parent_id
      ) as parent_message
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

exports.getThreadMessages = async (db, parentId) => {
  const query = queryDb(db);
  const res = await query(
    `
    SELECT 
      m.*,
      u.email as sender_email,
      e.first_name as sender_first_name,
      e.last_name as sender_last_name,
      (
        SELECT json_agg(json_build_object('id', mr.id, 'user_id', mr.user_id, 'emoji', mr.emoji))
        FROM message_reactions mr
        WHERE mr.message_id = m.id
      ) as reactions
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE m.parent_id = $1
    ORDER BY m.created_at ASC
    `,
    [parentId]
  );
  return res.rows;
};

exports.sendMessage = async (db, senderId, tenantId, conversationId, content, type = 'TEXT', fileUrl = null, parentId = null) => {
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
    INSERT INTO messages (conversation_id, sender_id, content, type, file_url, parent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [conversationId, senderId, content, type, fileUrl, parentId]
  );

  const message = res.rows[0];

  // Fetch full message details for socket payload
  const fullMessageRes = await query(
    `
    SELECT 
      m.*,
      u.email as sender_email,
      e.first_name as sender_first_name,
      e.last_name as sender_last_name,
      (
        SELECT json_agg(json_build_object('id', mr.id, 'user_id', mr.user_id, 'emoji', mr.emoji))
        FROM message_reactions mr
        WHERE mr.message_id = m.id
      ) as reactions,
      m.parent_id,
      (
        SELECT json_build_object('content', pm.content, 'sender_first_name', pe.first_name)
        FROM messages pm
        LEFT JOIN users pu ON pm.sender_id = pu.id
        LEFT JOIN employees pe ON pu.id = pe.user_id
        WHERE pm.id = m.parent_id
      ) as parent_message
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE m.id = $1
    `,
    [message.id] // Use the ID from the inserted message (which was res.rows[0])
  );

  // Update conversation updated_at
  await query(`UPDATE conversations SET updated_at = NOW() WHERE id=$1`, [conversationId]);

  // Increment unread_count for other participants
  await query(
    `UPDATE conversation_participants SET unread_count = unread_count + 1 WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
  );

  const fullMessage = fullMessageRes.rows[0];

  // Real-time broadcast
  try {
    const io = getIo();
    io.to(conversationId).emit("receive_message", fullMessage);

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

  return fullMessage;
};

exports.markAsRead = async (db, conversationId, userId) => {
  const query = queryDb(db);

  // Update unread count for participant
  await query(
    `UPDATE conversation_participants SET unread_count = 0 WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  // Mark all messages in this conversation as read if they were sent by others
  await query(
    `UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
    [conversationId, userId]
  );

  // Notify others that messages were read
  try {
    const io = getIo();
    // Emitting both for compatibility or updating frontend
    io.to(conversationId).emit("messages_read", { conversationId, readerId: userId });
  } catch (e) {
    console.error("Socket emit failed in markAsRead", e);
  }

  return { success: true };
};

exports.updateMessage = async (db, userId, conversationId, messageId, content) => {
  const query = queryDb(db);

  // Verify ownership
  const msgRes = await query(`SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2`, [messageId, conversationId]);
  if (msgRes.rowCount === 0) throw new NotFoundError("Message not found");
  if (msgRes.rows[0].sender_id !== userId) throw new ForbiddenError("You can only edit your own messages");

  const res = await query(
    `UPDATE messages SET content = $1, is_edited = true WHERE id = $2 RETURNING *`,
    [content, messageId]
  );

  // Real-time broadcast update
  try {
    const io = getIo();
    io.to(conversationId).emit("message_updated", res.rows[0]);
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  return res.rows[0];
};

exports.deleteMessage = async (db, userId, conversationId, messageId) => {
  const query = queryDb(db);

  // Verify ownership
  const msgRes = await query(`SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2`, [messageId, conversationId]);
  if (msgRes.rowCount === 0) throw new NotFoundError("Message not found");
  if (msgRes.rows[0].sender_id !== userId) throw new ForbiddenError("You can only delete your own messages");

  await query(`DELETE FROM messages WHERE id = $1`, [messageId]);

  // Real-time broadcast delete
  try {
    const io = getIo();
    io.to(conversationId).emit("message_deleted", { messageId, conversationId });
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  return true;
};

exports.togglePinMessage = async (db, conversationId, messageId) => {
  const query = queryDb(db);

  // Get current state
  const res = await query(`SELECT is_pinned FROM messages WHERE id = $1 AND conversation_id = $2`, [messageId, conversationId]);
  if (res.rowCount === 0) throw new NotFoundError("Message not found");

  const newState = !res.rows[0].is_pinned;
  const updateRes = await query(
    `UPDATE messages SET is_pinned = $1 WHERE id = $2 RETURNING *`,
    [newState, messageId]
  );

  // Real-time broadcast
  try {
    const io = getIo();
    io.to(conversationId).emit("message_pinned", updateRes.rows[0]);
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  return updateRes.rows[0];
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
      AND cp1.user_id != cp2.user_id
    LIMIT 1
    `,
    [tenantId, user1, user2]
  );

  if (existing.rowCount > 0) {
    return await exports.getConversation(db, existing.rows[0].id, user1);
  }

  // Start Transaction if possible (simplified here)
  const convRes = await query(
    `INSERT INTO conversations (type, tenant_id) VALUES ('DIRECT', $1) RETURNING id`,
    [tenantId]
  );
  const conversationId = convRes.rows[0].id;

  // Insert unique participants only
  const participants = [...new Set([user1, user2])];
  for (const u of participants) {
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
      [conversationId, u]
    );
  }

  return await exports.getConversation(db, conversationId, user1);
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

exports.createGroupConversation = async (db, creatorId, tenantId, name, participantIds) => {
  const query = queryDb(db);

  // Create Conversation
  const convRes = await query(
    `INSERT INTO conversations (type, name, tenant_id) VALUES ('GROUP', $1, $2) RETURNING id`,
    [name, tenantId]
  );
  const conversationId = convRes.rows[0].id;

  // Add Creator as Admin
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES ($1, $2, true)`,
    [conversationId, creatorId]
  );

  // Add other participants
  const uniqueIds = [...new Set(participantIds)].filter(id => id !== creatorId);
  for (const uid of uniqueIds) {
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
      [conversationId, uid]
    );
  }

  // Notify participants (optional, can be done via socket in controller)
  return await exports.getConversation(db, conversationId, creatorId);
};

exports.addReaction = async (db, messageId, userId, emoji) => {
  const query = queryDb(db);
  await query(
    `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [messageId, userId, emoji]
  );
  return { messageId, userId, emoji };
};

exports.removeReaction = async (db, messageId, userId, emoji) => {
  const query = queryDb(db);
  await query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji]
  );
  return { messageId, userId, emoji };
};

exports.updateUserStatus = async (db, userId, status) => {
  const query = queryDb(db);
  await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, userId]);
  return { userId, status };
};

exports.searchGlobal = async (db, tenantId, searchTerm) => {
  const query = queryDb(db);
  const term = `%${searchTerm}%`;

  // Search Users
  const usersRes = await query(`
        SELECT u.id, u.email, e.first_name, e.last_name, 'USER' as type
        FROM users u 
        LEFT JOIN employees e ON u.id = e.user_id 
        WHERE u.tenant_id = $1 
          AND (u.email ILIKE $2 OR e.first_name ILIKE $2 OR e.last_name ILIKE $2)
        LIMIT 5
    `, [tenantId, term]);

  // Search Messages (that the user is part of - simplified for now to global tenant for MVP or need user_id context)
  // IMPORTANT: For security, we should filter by what the user can see. 
  // For now, let's return just Users for Global Search as message search is expensive without full text index

  return {
    users: usersRes.rows,
    // messages: ...
  };
};
