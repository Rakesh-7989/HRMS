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

        // Join user's own room for direct notifications
        const userRoom = `user_${String(socket.user.id)}`;
        socket.join(userRoom);
        logger.info(`User ${socket.user.id} joined own room: ${userRoom}`);

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

        // --- WebRTC Signaling ---
        socket.on("call-user", async ({ to, offer, type, conversationId }) => {
            const targetRoom = `user_${String(to)}`;
            logger.info(`📞 Processing call-user from ${socket.user.id} to ${to} (${type}) in conv ${conversationId}`);

            // Exhaustive room audit
            const rooms = io.sockets.adapter.rooms;
            const clients = rooms.get(targetRoom);
            const numClients = clients ? clients.size : 0;

            const allUserRooms = Array.from(rooms.keys()).filter(r => r.startsWith('user_'));
            logger.info(`Room Audit: Target=${targetRoom}, ActiveSockets=${numClients}, AvailableUserRooms=[${allUserRooms.join(', ')}]`);

            if (numClients === 0) {
                logger.warn(`User ${to} is not reachable. No active sockets in ${targetRoom}.`);
            }

            io.to(targetRoom).emit("incoming-call", {
                from: socket.user.id,
                offer,
                type,
                conversationId,
                callerName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email
            });
            logger.info(`Signal 'incoming-call' emitted to ${numClients} sockets in room ${targetRoom}`);
        });

        socket.on("answer-call", ({ to, answer }) => {
            const targetRoom = `user_${String(to)}`;
            logger.info(`Answer-call from ${socket.user.id} to ${to}`);
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

        socket.on("end-call", ({ to }) => {
            const targetRoom = `user_${String(to)}`;
            logger.info(`End-call from ${socket.user.id} to ${to}`);
            io.to(targetRoom).emit("call-ended", {
                from: socket.user.id
            });
        });

        socket.on("disconnect", () => {
            logger.info(`User disconnected: ${socket.user.id}`);
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
