import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/utils/constants';
import api from '@/services/api';

interface CallInfo {
    from: string;
    offer: RTCSessionDescriptionInit;
    type: 'audio' | 'video';
    callerName: string;
    conversationId?: string;
}

interface ChatContextType {
    socket: Socket | null;
    isConnected: boolean;
    sendMessage: (room: string, message: any) => void;
    joinRoom: (room: string) => void;
    // Calling
    isCalling: boolean;
    activeCall: { to: string; name: string; type: 'audio' | 'video'; conversationId?: string } | null;
    incomingCall: CallInfo | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    initiateCall: (to: string, name: string, type: 'audio' | 'video', conversationId?: string) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    toggleAudio: () => void;
    toggleVideo: () => void;
    markAsRead: (conversationId: string) => Promise<void>;
    logCall: (conversationId: string, callType: string, duration: number, status: string) => Promise<void>;
    totalUnreadCount: number;
    typingStatus: Record<string, string[]>; // convId -> list of user names
    sendTypingStatus: (conversationId: string, isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ICE_SERVERS = {
    iceServers: [
        // Public STUN servers (free, for simple NAT traversal)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },

        // Your TURN server (required for production - set via env vars)
        ...(import.meta.env.VITE_TURN_SERVER ? [
            {
                urls: import.meta.env.VITE_TURN_SERVER,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            },
            {
                urls: `${import.meta.env.VITE_TURN_SERVER}?transport=tcp`,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            }
        ] : []),

        // TURNS (TLS) for strict firewalls
        ...(import.meta.env.VITE_TURNS_SERVER ? [
            {
                urls: import.meta.env.VITE_TURNS_SERVER,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            }
        ] : [])
    ],
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Calling State
    const [isCalling, setIsCalling] = useState(false);
    const [activeCall, setActiveCall] = useState<{ to: string; name: string; type: 'audio' | 'video'; conversationId?: string } | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
    const queryClient = useQueryClient();
    const callStartTime = useRef<number | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);

    // Fetch conversations and set total unread count
    const fetchTotalUnread = async () => {
        try {
            const res = await api.get('/chat/conversations');
            const conversations = res.data.data;
            const total = conversations.reduce((acc: number, conv: any) => acc + (conv.unread_count || 0), 0);
            setTotalUnreadCount(total);
        } catch (err) {
            console.error("Failed to fetch total unread:", err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTotalUnread();
        }
    }, [user]);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        if (user) {
            // Get token
            const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            const socketUrl = API_BASE_URL.replace('/api', '');

            const newSocket = io(socketUrl, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            newSocket.on('connect', () => {
                console.log('[Socket] Connected as user:', user?.id);
                setIsConnected(true);
            });

            newSocket.on('connect_error', (err) => {
                console.error('[Socket] Connection error:', err);
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
                endCall();
            });

            newSocket.on('incoming-call', (data: CallInfo) => {
                console.log('[Socket] Incoming call received from:', data.from, data.callerName);
                import('react-hot-toast').then(({ toast }) => {
                    toast.success(`Incoming call from ${data.callerName}`);
                });
                setIncomingCall(data);
            });

            newSocket.on('call-answered', async ({ answer }) => {
                if (peerConnection.current) {
                    try {
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
                        // Process pending candidates
                        while (pendingCandidates.current.length > 0) {
                            const cand = pendingCandidates.current.shift();
                            if (cand) await peerConnection.current.addIceCandidate(new RTCIceCandidate(cand));
                        }
                    } catch (err) {
                        console.error('Error setting remote description or processing candidates', err);
                    }
                }
            });

            newSocket.on('ice-candidate', async ({ candidate }) => {
                const pc = peerConnection.current;
                if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error('Error adding ice candidate', e);
                    }
                } else {
                    pendingCandidates.current.push(candidate);
                }
            });

            newSocket.on('call-ended', () => {
                cleanupCall();
            });

            newSocket.on('unread_update', ({ conversationId }: { conversationId: string }) => {
                console.log('[Socket] Unread update for:', conversationId);
                fetchTotalUnread();
            });

            newSocket.on('user_typing', ({ conversationId, userName, userId }) => {
                if (userId === user.id) return;
                setTypingStatus(prev => {
                    const current = prev[conversationId] || [];
                    if (current.includes(userName)) return prev;
                    return { ...prev, [conversationId]: [...current, userName] };
                });
            });

            newSocket.on('user_stopped_typing', ({ conversationId }) => {
                setTypingStatus(prev => {
                    return { ...prev, [conversationId]: [] };
                });
            });

            newSocket.on('messages_read', ({ conversationId }) => {
                // Invalidate messages query to show blue checkmarks
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            });

            setSocket(newSocket);
            return () => { newSocket.disconnect(); };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [user]);

    const setupPeerConnection = (targetUserId: string) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', { to: targetUserId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        peerConnection.current = pc;
        return pc;
    };

    const cleanupCall = () => {
        if (activeCall?.conversationId && callStartTime.current) {
            const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
            logCall(activeCall.conversationId, activeCall.type, duration, 'ended');
        } else if (incomingCall?.conversationId) {
            // Missed call logic could go here if rejected
        }

        callStartTime.current = null;
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        pendingCandidates.current = [];
        setRemoteStream(null);
        setActiveCall(null);
        setIsCalling(false);
        setIncomingCall(null);
        setIsMuted(false);
        setIsVideoOff(false);
    };

    const initiateCall = async (to: string, name: string, type: 'audio' | 'video', conversationId?: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            setLocalStream(stream);
            setActiveCall({ to, name, type, conversationId });
            setIsCalling(true);
            callStartTime.current = Date.now();

            const pc = setupPeerConnection(to);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (socket) {
                socket.emit('call-user', { to, offer, type, conversationId });
            }
        } catch (err) {
            console.error("Failed to initiate call", err);
            cleanupCall();
        }
    };

    const acceptCall = async () => {
        if (!incomingCall || !socket) return;

        // Capture needed values before async operations
        const callerId = incomingCall.from;
        const callType = incomingCall.type;
        const callOffer = incomingCall.offer;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true
            });
            setLocalStream(stream);
            setActiveCall({
                to: callerId,
                name: incomingCall.callerName || 'Unknown Caller',
                type: callType,
                conversationId: incomingCall.conversationId
            });
            callStartTime.current = Date.now();
            setIncomingCall(null);

            const pc = setupPeerConnection(callerId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(callOffer));

            // Process pending candidates
            while (pendingCandidates.current.length > 0) {
                const cand = pendingCandidates.current.shift();
                if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer-call', { to: callerId, answer });
        } catch (err) {
            console.error("Failed to accept call:", err);
            cleanupCall();
        }
    };

    const rejectCall = () => {
        if (incomingCall && socket) {
            socket.emit('end-call', { to: incomingCall.from });
            if (incomingCall.conversationId) {
                logCall(incomingCall.conversationId, incomingCall.type, 0, 'missed');
            }
        }
        setIncomingCall(null);
    };

    const endCall = () => {
        const target = activeCall?.to || incomingCall?.from;
        if (target && socket) {
            socket.emit('end-call', { to: target });
        }
        cleanupCall();
    };

    const sendMessage = (room: string, message: any) => {
        if (socket) {
            socket.emit('send_message', { room, ...message });
        }
    };

    const joinRoom = (room: string) => {
        if (socket) {
            socket.emit('join_room', room);
        }
    };

    const sendTypingStatus = (conversationId: string, isTyping: boolean) => {
        if (socket) {
            socket.emit(isTyping ? 'typing_start' : 'typing_stop', conversationId);
        }
    };

    const markAsRead = async (conversationId: string) => {
        try {
            await api.post(`/chat/conversations/${conversationId}/read`);
            fetchTotalUnread(); // Refresh count after marking as read
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const logCall = async (conversationId: string, callType: string, duration: number, status: string) => {
        try {
            await api.post(`/chat/conversations/${conversationId}/log-call`, {
                callType, duration, status
            });
        } catch (err) {
            console.error("Failed to log call:", err);
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <ChatContext.Provider value={{
            socket, isConnected, sendMessage, joinRoom,
            isCalling, activeCall, incomingCall, localStream, remoteStream,
            initiateCall, acceptCall, rejectCall, endCall,
            isMuted, isVideoOff, toggleAudio, toggleVideo,
            markAsRead, logCall,
            totalUnreadCount,
            typingStatus, sendTypingStatus
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
