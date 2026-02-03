# Chat & Real-Time Calling System Documentation

This document provides a technical overview of the Chat and Video/Audio calling implementation within the HRMS-GZ platform.

## 🚀 Technologies Used
- **Socket.io**: Used for real-time bidirectional event-based communication.
- **WebRTC**: Used for Peer-to-Peer (P2P) audio and video streaming.
- **PostgreSQL**: Stores conversation history, participants, and message data.
- **React Context API**: Manages global chat state, socket connections, and media streams.

---

## 📂 File Manifest

### New Files Created
| File Path | Description |
| :--- | :--- |
| `backend/src/config/socket.js` | Socket.io initialization, authentication, and signaling handlers. |
| `backend/src/modules/chat/chat.controller.js` | API endpoints for fetching contacts and conversations. |
| `backend/src/modules/chat/chat.service.js` | Database queries for messaging and participant management. |
| `backend/src/modules/chat/chat.routes.js` | Route definitions for `/api/chat`. |
| `frontend/src/contexts/ChatContext.tsx` | Global provider for Socket connections and WebRTC logic. |
| `frontend/src/components/chat/CallOverlay.tsx` | Premium UI for incoming, outgoing, and active calls. |
| `S3_MIGRATION_PLAN.md` | Strategy for future cloud storage integration. |

### Modified Files
| File Path | Nature of Update |
| :--- | :--- |
| `backend/src/server.js` | Integrated Socket.io with the HTTP server. |
| `backend/src/routes/index.js` | Registered the chat module routes. |
| `frontend/src/main.tsx` | Wrapped the application in `ChatProvider` and added `CallOverlay`. |
| `frontend/src/pages/ChatPage.tsx` | Built the chat UI, contact selection, and calling triggers. |

---

## 🏗️ Architecture Overview

### 1. Real-Time Messaging (Socket.io)
- **Automatic Rooms**: Every user joins a unique room `user_{userId}` upon connection. This allows the server to target specific individuals for private messages or call invites.
- **Tenant Isolation**: Users automatically join `tenant_{tenantId}` to facilitate group wide notifications (if implemented in future).
- **Message Flow**:
    1. User A sends a message via API (PostgreSQL persistence).
    2. Server broadcasts the message to the conversation room.
    3. User B's frontend receives `receive_message` and updates the UI state.

### 2. Video & Audio Calling (WebRTC)
The calling system uses the **Signaling** pattern:
- **Initiation**: User A (`offer`) -> Server -> User B (`incoming-call`).
- **Answer**: User B (`answer`) -> Server -> User A (`call-answered`).
- **P2P Discovery**: Both users exchange **ICE Candidates** via the server to find the best network path to each other.
- **Media Streams**: Once the connection is established, video/audio data flows **directly between browsers**, bypassing the server for maximum speed and privacy.

### 3. Database Schema
- `conversations`: Header info (type: DIRECT/GROUP, name).
- `conversation_participants`: Many-to-Many link between Users and Conversations.
- `messages`: Content, sender, and file attachments.

---

## 👨‍💻 Developer Notes for Future Work
- **STUN/TURN Servers**: Currently using Google's public STUN server. For production across restricted corporate firewalls, you **must** configure a TURN server (e.g., Twilio) in `ChatContext.tsx`.
- **Ringtones**: The `CallOverlay` is visually complete but "Silent". Add audio elements to `acceptCall`/`initiateCall` for a better user experience.
- **Group Calling**: The current implementation is Peer-to-Peer (1v1). For group calls, consider integrating an SFU (Selective Forwarding Unit) like Mediasoup or Jitsi.
