const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const env = require("./env");
const logger = require("./logger");

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"], // Add your frontend URLs
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth.token ||
                (socket.handshake.headers.authorization &&
                    socket.handshake.headers.authorization.split(" ")[1]);

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

            // We use pool.connect() to get a client and manually query 
            // to avoid RLS logic which might fail without a request context
            const client = await pool.connect();
            try {
                const userRes = await client.query(
                    `SELECT u.id, u.tenant_id, u.role, u.is_active, u.email, 
                            e.first_name, e.last_name 
                     FROM users u 
                     LEFT JOIN employees e ON u.id = e.user_id 
                     WHERE u.id = $1`,
                    [decoded.id]
                );

                if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
                    return next(new Error("Authentication error: Invalid user"));
                }

                socket.user = userRes.rows[0]; // Attach user to socket
                next();
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error("Socket authentication failed", err);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`User connected: ${socket.user.id}`);

        // Join tenant room automatically
        socket.join(`tenant_${socket.user.tenant_id}`);

        const userRoom = `user_${String(socket.user.id)}`;
        socket.join(userRoom);
        logger.info(`User ${socket.user.id} joined own room: ${userRoom}`);

        // Update status to ONLINE if this was the first connection for this user
        const userSockets = io.sockets.adapter.rooms.get(userRoom);
        if (userSockets && userSockets.size === 1) {
            (async () => {
                const client = await pool.connect();
                try {
                    await client.query(`SET app.tenant_id = '${socket.user.tenant_id}'`);
                    await client.query(`SET app.user_id = '${socket.user.id}'`);
                    await client.query('UPDATE users SET status = $1 WHERE id = $2', ['ONLINE', socket.user.id]);
                    io.to(`tenant_${socket.user.tenant_id}`).emit('user_status_change', { userId: socket.user.id, status: 'ONLINE' });
                    logger.info(`User ${socket.user.id} status updated to ONLINE`);
                } catch (err) {
                    logger.error(`Failed to update status for user ${socket.user.id}`, err);
                } finally {
                    client.release();
                }
            })();
        }

        socket.on("join_room", (roomId) => {
            socket.join(roomId);
            logger.info(`User ${socket.user.id} joined conversation room: ${roomId}`);
        });

        socket.on("leave_room", (roomId) => {
            socket.leave(roomId);
            logger.info(`User ${socket.user.id} left room: ${roomId}`);
        });

        socket.on("send_message", (data) => {
            // Basic echo for testing Phase 1
            // In Phase 2, we will save to DB and broadcast to specific room
            // io.to(data.room).emit("receive_message", data);
        });

        socket.on("typing_start", (conversationId) => {
            socket.to(conversationId).emit("user_typing", {
                conversationId,
                userId: socket.user.id,
                userName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
            });
        });

        socket.on("typing_stop", (conversationId) => {
            socket.to(conversationId).emit("user_stopped_typing", {
                conversationId,
                userId: socket.user.id
            });
        });

        socket.on("group-call-started", async ({ conversationId, type }) => {
            logger.info(`📞 Group call started by ${socket.user.id} in room ${conversationId}`);

            try {
                // Fetch all participants for this conversation to send global notifications
                const client = await pool.connect();
                try {
                    // Manual RLS context setup for read query just in case, though usually SELECTS might be looser or use different pattern
                    // But to be safe lets reuse the pattern if needed, or rely on super admin bypass if we had it.
                    // Actually, simple SELECT might work if RLS allows reading own conversations.
                    // Let's just use the query directly.
                    await client.query(`SET app.tenant_id = '${socket.user.tenant_id}'`);
                    await client.query(`SET app.user_id = '${socket.user.id}'`);

                    const participantsRes = await client.query(
                        "SELECT user_id FROM conversation_participants WHERE conversation_id = $1",
                        [conversationId]
                    );

                    const participants = participantsRes.rows;

                    participants.forEach(p => {
                        // Don't send notification to the person who started the call
                        if (p.user_id === socket.user.id) return;

                        const targetRoom = `user_${String(p.user_id)}`;
                        io.to(targetRoom).emit("incoming-call", {
                            from: socket.user.id,
                            type,
                            conversationId,
                            isGroup: true,
                            callerName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
                        });
                    });
                } finally {
                    client.release();
                }
            } catch (err) {
                logger.error("Failed to fetch group participants for call broadcast", err);
                // Fallback: Still emit to room in case people are actively in the chat tab
                socket.to(conversationId).emit("incoming-call", {
                    from: socket.user.id,
                    type,
                    conversationId,
                    isGroup: true,
                    callerName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
                });
            }
        });

        // --- WebRTC Signaling ---
        socket.on("call-user", async ({ to, offer, type, conversationId }) => {
            const targetRoom = `user_${String(to)}`;
            io.to(targetRoom).emit("incoming-call", {
                from: socket.user.id,
                offer,
                type,
                conversationId,
                callerName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
            });
        });

        socket.on("answer-call", ({ to, answer }) => {
            const targetRoom = `user_${String(to)}`;
            io.to(targetRoom).emit("call-answered", {
                from: socket.user.id,
                answer
            });
        });

        socket.on("ice-candidate", ({ to, candidate }) => {
            const targetRoom = `user_${String(to)}`;
            io.to(targetRoom).emit("ice-candidate", {
                from: socket.user.id,
                candidate
            });
        });

        socket.on("call-hold", ({ to, isGroup }) => {
            const target = isGroup ? to : `user_${String(to)}`;
            socket.to(target).emit("call-hold", { from: socket.user.id });
        });

        socket.on("call-resume", ({ to, isGroup }) => {
            const target = isGroup ? to : `user_${String(to)}`;
            socket.to(target).emit("call-resume", { from: socket.user.id });
        });

        socket.on("end-call", async ({ to, isGroup }) => {
            if (isGroup) {
                // For group calls, 'to' is the conversationId (room)
                socket.to(to).emit("call-ended", { from: socket.user.id });
                socket.leave(to);

                // Check if anyone else is still in the room
                const room = io.sockets.adapter.rooms.get(to);
                if (!room || room.size === 0) {
                    logger.info(`🚫 Group call in room ${to} has ended (last user left)`);
                    // Broadcast to all conversation participants that the call is totally over
                    try {
                        const client = await pool.connect();
                        // Manual RLS
                        await client.query(`SET app.tenant_id = '${socket.user.tenant_id}'`);

                        const parts = await client.query("SELECT user_id FROM conversation_participants WHERE conversation_id = $1", [to]);
                        client.release();

                        parts.rows.forEach(p => {
                            io.to(`user_${String(p.user_id)}`).emit("group-call-ended", { conversationId: to });
                        });
                    } catch (e) { console.error("End broadcast failed", e); }
                }
            } else {
                const targetRoom = `user_${String(to)}`;
                io.to(targetRoom).emit("call-ended", {
                    from: socket.user.id
                });
            }
        });

        socket.on("add-to-call", ({ to, conversationId, type, callerName }) => {
            if (!to) {
                logger.warn(`⚠️ [Socket] add-to-call attempt without target user by ${socket.user.id}`);
                return;
            }
            const targetRoom = `user_${String(to)}`;
            logger.info(`📡 [Socket] User ${socket.user.id} inviting ${to} to room ${conversationId || 'P2P'}`);
            io.to(targetRoom).emit("incoming-call", {
                from: socket.user.id,
                type,
                conversationId,
                isGroup: true,
                callerName: callerName || `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
            });
        });

        socket.on("update_manual_status", async (newStatus) => {
            const client = await pool.connect();
            try {
                // newStatus: available, busy, dnd, away, offline
                await client.query(`SET app.tenant_id = '${socket.user.tenant_id}'`);
                await client.query(`SET app.user_id = '${socket.user.id}'`);

                await client.query('UPDATE users SET status = $1 WHERE id = $2', [newStatus.toUpperCase(), socket.user.id]);

                io.to(`tenant_${socket.user.tenant_id}`).emit('user_status_change', {
                    userId: socket.user.id,
                    status: newStatus.toUpperCase()
                });
                logger.info(`User ${socket.user.id} manually updated status to ${newStatus}`);
            } catch (err) {
                logger.error(`Failed to manually update status for user ${socket.user.id}`, err);
            } finally {
                client.release();
            }
        });

        socket.on("disconnect", async () => {
            logger.info(`User disconnected: ${socket.user.id}`);

            // Update status to OFFLINE if this was the last connection
            const userRoom = `user_${String(socket.user.id)}`;
            const userSockets = io.sockets.adapter.rooms.get(userRoom);
            if (!userSockets || userSockets.size === 0) {
                const client = await pool.connect();
                try {
                    await client.query(`SET app.tenant_id = '${socket.user.tenant_id}'`);
                    await client.query(`SET app.user_id = '${socket.user.id}'`);
                    await client.query('UPDATE users SET status = $1 WHERE id = $2', ['OFFLINE', socket.user.id]);
                    io.to(`tenant_${socket.user.tenant_id}`).emit('user_status_change', { userId: socket.user.id, status: 'OFFLINE' });
                    logger.info(`User ${socket.user.id} status updated to OFFLINE`);
                } catch (err) {
                    logger.error(`Failed to update disconnect status for user ${socket.user.id}`, err);
                } finally {
                    client.release();
                }
            }
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIo };
