import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/utils/constants';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { showToast } from '@/utils/toast';

import { API_BASE_URL as STATIC_BASE_URL } from '@/utils/constants';
const resolveImageUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const base = STATIC_BASE_URL.replace('/api', '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface ParticipantInfo {
    name: string;
    designation: string;
    avatar?: string;
    status?: 'active' | 'hold';
}

interface CallInfo {
    from: string;
    offer: RTCSessionDescriptionInit;
    type: 'audio' | 'video';
    callerName: string;
    conversationId?: string;
}

export interface ChatNotification {
    messageId: string;
    conversationId: string;
    conversationName?: string;
    conversationType: 'DIRECT' | 'GROUP';
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    type: 'TEXT' | 'FILE' | 'IMAGE' | 'CALL';
    createdAt: string;
}

export interface UserStatusInfo {
    status: 'available' | 'busy' | 'dnd' | 'away' | 'offline';
    lastSeen: string;
    message?: string;
    messageExpiry?: string | null;
}

interface ChatContextType {
    socket: Socket | null;
    isConnected: boolean;
    sendMessage: (room: string, message: Record<string, unknown>) => void;
    joinRoom: (room: string) => void;
    // Calling
    isCalling: boolean;
    activeCall: { to: string; name: string; type: 'audio' | 'video'; conversationId?: string; isGroup?: boolean } | null;
    incomingCall: CallInfo & { isGroup?: boolean } | null;
    localStream: MediaStream | null;
    remoteStreams: Record<string, MediaStream>;
    callParticipants: Record<string, ParticipantInfo>;
    activeRoomCall: string | null; // The conversation ID of an active call in the current room
    initiateCall: (to: string, name: string, type: 'audio' | 'video', conversationId?: string, isGroup?: boolean) => Promise<void>;
    acceptCall: () => Promise<void>;
    joinActiveCall: (conversationId: string, type: 'audio' | 'video') => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    toggleAudio: () => void;
    toggleVideo: () => void;
    markAsRead: (conversationId: string) => Promise<void>;
    logCall: (conversationId: string, callType: string, duration: number, status: string) => Promise<void>;
    totalUnreadCount: number;
    typingStatus: Record<string, string[]>;
    sendTypingStatus: (conversationId: string, isTyping: boolean) => void;
    isScreenSharing: boolean;
    toggleScreenShare: () => Promise<void>;
    addParticipantToCall: (userId: string, userName: string) => void;
    speakingUsers: Set<string>;
    callDuration: number;
    chatNotifications: ChatNotification[];
    dismissChatNotification: (messageId: string) => void;
    setActiveConversation: (conversationId: string | null) => void;
    heldCall: { to: string; name: string; type: 'audio' | 'video'; conversationId?: string; isGroup?: boolean } | null;
    isResuming: boolean;
    // Presence
    myStatus: 'available' | 'busy' | 'dnd' | 'away' | 'offline';
    updateMyStatus: (status: 'available' | 'busy' | 'dnd' | 'away' | 'offline') => void;
    updateMyStatusMessage: (message: string, expiry: string | null) => void;
    userStatuses: Record<string, UserStatusInfo>;
}


const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const [isCalling, setIsCalling] = useState(false);
    const [activeCall, setActiveCall] = useState<ChatContextType['activeCall']>(null);
    const [incomingCall, setIncomingCall] = useState<ChatContextType['incomingCall']>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [callParticipants, setCallParticipants] = useState<Record<string, ParticipantInfo>>({});
    const [activeRoomCall, setActiveRoomCall] = useState<string | null>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
    const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
    const [heldCall, setHeldCall] = useState<ChatContextType['activeCall']>(null);
    const [isResuming, setIsResuming] = useState(false);
    const [myStatus, setMyStatus] = useState<'available' | 'busy' | 'dnd' | 'away' | 'offline'>(
        (localStorage.getItem('userPresenceStatus') as 'available' | 'busy' | 'dnd' | 'away' | 'offline') || 'available'
    );
    const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusInfo>>({});
    const heldCallRef = useRef<ChatContextType['activeCall']>(null);
    useEffect(() => { heldCallRef.current = heldCall; }, [heldCall]);
    const chatDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeConversationRef = useRef<string | null>(null);

    const queryClient = useQueryClient();
    const callStartTime = useRef<number | null>(null);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const screenStreamRef = useRef<MediaStream | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const analysers = useRef<Map<string, AnalyserNode>>(new Map());

    // State Refs for stable access in listeners
    const activeCallRef = useRef(activeCall);
    const localStreamRef = useRef(localStream);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    const updateMyStatus = useCallback((status: 'available' | 'busy' | 'dnd' | 'away' | 'offline') => {
        setMyStatus(status);
        localStorage.setItem('userPresenceStatus', status);
        socketRef.current?.emit('update_manual_status', status);
    }, []);

    const handleMediaError = useCallback((err: Error) => {
        console.error("Media access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showToast.error("Permission denied. Please allow access to your microphone/camera.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showToast.error("No microphone or camera found. Please connect a device.");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            showToast.error("Device is currently in use by another application.");
        } else {
            showToast.error("Failed to access media devices: " + (err.message || "Unknown error"));
        }
    }, []);

    const fetchTotalUnread = useCallback(async () => {
        try {
            const res = await api.get('/chat/conversations');
            const total = res.data.data.reduce((acc: number, conv: Record<string, unknown>) => acc + ((conv.unread_count as number) || 0), 0);
            setTotalUnreadCount(total);
        } catch (err: unknown) { console.error("Unread fetch failed", err); }
    }, []);

    const logCall = useCallback(async (conversationId: string, callType: string, duration: number, status: string) => {
        try { await api.post(`/chat/conversations/${conversationId}/log-call`, { callType, duration, status }); }
        catch (err: unknown) { console.error("Log call failed", err); }
    }, []);

    const cleanupCall = useCallback(() => {
        if (activeCallRef.current?.conversationId && callStartTime.current) {
            const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
            logCall(activeCallRef.current.conversationId, activeCallRef.current.type, duration, 'ended');
        }
        updateMyStatus('available');

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; });
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }

        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        pendingCandidates.current.clear();

        setRemoteStreams(prev => {
            Object.values(prev).forEach(s => s.getTracks().forEach(t => t.stop()));
            return {};
        });

        analysers.current.forEach(a => a.disconnect());
        analysers.current.clear();
        setActiveCall(null);
        activeCallRef.current = null;
        setIsCalling(false);
        setIncomingCall(null);
        setLocalStream(null);
        localStreamRef.current = null;
        setCallParticipants({});
        setIsMuted(false);
        setIsVideoOff(true);
        setIsScreenSharing(false);
        setSpeakingUsers(new Set());
        callStartTime.current = null;
    }, [logCall, updateMyStatus]);

    const fetchParticipantInfo = useCallback(async (userId: string) => {
        if (!userId || userId === 'undefined') {
            console.warn("[ChatContext] Attempted to fetch participant with invalid ID");
            return;
        }
        try {
            const res = await api.get(`/users/${userId}`);
            const data = res.data.user || res.data.data;
            if (!data) return;
            setCallParticipants(prev => ({
                ...prev,
                [userId]: {
                    name: `${data.first_name || 'User'} ${data.last_name || ''}`.trim() || `User ${userId.slice(0, 4)}`,
                    designation: data.job_title || data.role || 'Team Member',
                    avatar: resolveImageUrl(data.profile_photo_url || data.avatar)
                }
            }));
        } catch (err: unknown) {
            console.error(`Fetch participant ${userId} failed`, err);
        }
    }, []);

    const monitorAudioLevel = useCallback((userId: string, stream: MediaStream) => {
        if (!stream.getAudioTracks().length) return;
        try {
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            const source = audioContext.current.createMediaStreamSource(stream);
            const analyser = audioContext.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analysers.current.set(userId, analyser);
        } catch (e) { console.warn("Audio Context init failed", e); }
    }, []);

    const setupPeerConnection = useCallback((targetUserId: string, stream: MediaStream, socketInstance: Socket) => {
        if (!targetUserId || targetUserId === 'undefined') {
            console.error("[WebRTC] Cannot setup PC: targetUserId is missing");
            return new RTCPeerConnection(); // Dummy to avoid crash
        }
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current.set(targetUserId, pc);

        pc.onicecandidate = (e) => {
            if (e.candidate) socketInstance.emit('ice-candidate', { to: targetUserId, candidate: e.candidate });
        };

        pc.ontrack = (e) => {
            const remoteStream = e.streams[0];
            setRemoteStreams(prev => {
                if (prev[targetUserId] === remoteStream) return prev;
                return { ...prev, [targetUserId]: remoteStream };
            });
            monitorAudioLevel(targetUserId, remoteStream);
            fetchParticipantInfo(targetUserId);
        };

        pc.onconnectionstatechange = () => {
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
                peerConnections.current.delete(targetUserId);
                setRemoteStreams(prev => { const next = { ...prev }; delete next[targetUserId]; return next; });
                setCallParticipants(prev => { const next = { ...prev }; delete next[targetUserId]; return next; });
            }
        };

        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        return pc;
    }, [monitorAudioLevel, fetchParticipantInfo]);

    useEffect(() => {
        if (!user) {
            if (socket) { socket.disconnect(); setSocket(null); setIsConnected(false); }
            return;
        }

        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const socketUrl = API_BASE_URL.endsWith('/api')
            ? API_BASE_URL.slice(0, -4)
            : API_BASE_URL.replace(/\/api$/, '');

        const s = io(socketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        socketRef.current = s;

        s.on('connect', () => {
            setIsConnected(true);

            // Restore user status from local storage
            const savedStatus = localStorage.getItem('userPresenceStatus');
            if (savedStatus && savedStatus !== 'available') {
                s.emit('update_manual_status', savedStatus);
            }

            // Re-join the active call room if we were in a call during disconnect
            if (activeCallRef.current?.conversationId) {
                s.emit('join_room', activeCallRef.current.conversationId);
            }
        });
        s.on('disconnect', () => { setIsConnected(false); }); // Removed cleanupCall to allow reconnection during calls

        s.on('incoming-call', async (data) => {
            if (data.isGroup) {
                setActiveRoomCall(data.conversationId);
            }

            const isAlreadyInThisCall = !!(data.conversationId && activeCallRef.current?.conversationId === data.conversationId);

            // 1. MESH HANDSHAKE: If we are already in the call, handle the peer synchronization
            if (data.isGroup && !data.offer && data.from && data.from !== user?.id && isAlreadyInThisCall) {
                if (localStreamRef.current) {
                    const existingPC = peerConnections.current.get(data.from);
                    if (!existingPC || ["closed", "failed", "disconnected"].includes(existingPC.connectionState)) {
                        const pc = setupPeerConnection(data.from, localStreamRef.current, s);
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            s.emit('call-user', {
                                to: data.from, offer,
                                type: activeCallRef.current?.type || 'video',
                                conversationId: data.conversationId
                            });
                            fetchParticipantInfo(data.from);
                        } catch (e) { console.error("[Mesh] Handshake failed", e); }
                    }
                }
                return;
            }

            // 2. NEW CALL NOTIFICATION: If it's a new call (or one we haven't joined yet)
            const isInvite = data.isGroup && !data.offer;
            const isNewCallSync = data.offer || isInvite;

            if (isNewCallSync && data.from && data.from !== user?.id) {
                // ALLOW offers if we are in the call but the PC is gone (someone re-joined)
                const pc = peerConnections.current.get(data.from);
                const isResumeOffer = !!(data.offer && isAlreadyInThisCall && (!pc || pc.connectionState !== 'connected'));

                // If we aren't in a call, or we are in a call but this is a DIFFERENT room/group, or it's a resume offer
                const isAcceptable = !activeCallRef.current || (!isAlreadyInThisCall) || isResumeOffer;

                if (isAcceptable && !isResumeOffer) {
                    console.info(`[Notification] SUCCESS: Showing popup for ${data.from}.`);
                    fetchParticipantInfo(data.from);
                    setIncomingCall(data);

                    toast.dismiss(`call-${data.from}`); // avoid duplicates
                    toast(`${data.isGroup ? 'Group Call Invite' : 'Incoming Call'}`, {
                        icon: '📞',
                        id: `call-${data.from}`,
                        duration: 10000,
                        position: 'top-center'
                    });
                    return;
                } else if (!isAcceptable) {
                    console.warn(`[Notification] BLOCKED: Already in this call or busy. room_match: ${isAlreadyInThisCall}`);
                }
            } else {
                console.debug(`[Notification] IGNORED: Signal is not a new call or is from self.`, { isNewCallSync, from: data.from });
            }

            // 3. INCOMING MESH OFFER: Handle Standard WebRTC offers during a call
            if (data.offer && isAlreadyInThisCall) {
                let pc = peerConnections.current.get(data.from);
                if (!pc && localStreamRef.current) {
                    pc = setupPeerConnection(data.from, localStreamRef.current, s);
                }
                if (pc) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        s.emit('answer-call', { to: data.from, answer });
                        fetchParticipantInfo(data.from);
                    } catch (e) { console.error("[Mesh] Offer acceptance failed", e); }
                }
            }
        });

        s.on('call-answered', async ({ from, answer }) => {
            const pc = peerConnections.current.get(from);
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    const cands = pendingCandidates.current.get(from) || [];
                    while (cands.length > 0) {
                        const c = cands.shift();
                        if (c) await pc.addIceCandidate(new RTCIceCandidate(c));
                    }
                    fetchParticipantInfo(from);
                } catch (e) { console.error("Answer error", e); }
            }
        });

        s.on('ice-candidate', async ({ from, candidate }) => {
            const pc = peerConnections.current.get(from);
            if (pc && pc.remoteDescription) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* Swallow error intentionally */ }
            } else {
                const cands = pendingCandidates.current.get(from) || [];
                cands.push(candidate);
                pendingCandidates.current.set(from, cands);
            }
        });

        s.on('call-ended', ({ from }) => {
            if (activeCallRef.current?.isGroup) {
                const pc = peerConnections.current.get(from);
                if (pc) { pc.close(); peerConnections.current.delete(from); }
                setRemoteStreams(prev => { const n = { ...prev }; delete n[from]; return n; });
                setCallParticipants(prev => { const n = { ...prev }; delete n[from]; return n; });
            } else cleanupCall();
        });

        s.on('group-call-ended', ({ conversationId }) => {
            setActiveRoomCall(prev => prev === conversationId ? null : prev);
        });

        s.on('user_typing', ({ conversationId, userName, userId }) => {
            if (userId === user.id) return;
            setTypingStatus(prev => ({ ...prev, [conversationId]: Array.from(new Set([...(prev[conversationId] || []), userName])) }));
        });
        s.on('user_stopped_typing', ({ conversationId }) => setTypingStatus(prev => ({ ...prev, [conversationId]: [] })));
        s.on('unread_update', fetchTotalUnread);
        s.on('user_status_change', (data: { userId: string, status: string }) => {
            const rawStatus = data.status.toLowerCase();
            const mappedStatus = rawStatus === 'online' ? 'available' : rawStatus;
            setUserStatuses(prev => ({
                ...prev,
                [data.userId]: { ...prev[data.userId], status: mappedStatus } as UserStatusInfo
            }));
            if (data.userId === user?.id) {
                setMyStatus(mappedStatus as 'available' | 'busy' | 'dnd' | 'away' | 'offline');
                localStorage.setItem('userPresenceStatus', mappedStatus);
            }
        });

        s.on('user_status_message_change', (data: { userId: string, message: string, expiry: string }) => {
            setUserStatuses(prev => ({
                ...prev,
                [data.userId]: { ...prev[data.userId], message: data.message, expiry: data.expiry }
            }));
        });

        // Global chat notification listener (similar to incoming-call)
        s.on('chat_notification', (data: ChatNotification) => {
            // Skip notification if user is currently viewing this conversation
            if (activeConversationRef.current === data.conversationId) return;

            // Add to notifications stack
            setChatNotifications(prev => {
                // Avoid duplicate notifications for same message
                if (prev.find(n => n.messageId === data.messageId)) return prev;
                return [data, ...prev];
            });

            // Reset the single dismiss timer — card stays 5s after the LAST message
            if (chatDismissTimerRef.current) {
                clearTimeout(chatDismissTimerRef.current);
            }
            chatDismissTimerRef.current = setTimeout(() => {
                setChatNotifications([]);
                chatDismissTimerRef.current = null;
            }, 5000);

            // Play a notification sound
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => { });
            } catch (e) { /* ignore */ }
        });
        s.on('messages_read', ({ conversationId }) => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }));

        s.on('chat_cleared', ({ conversationId }) => {
            queryClient.setQueryData(['messages', conversationId], []);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });

        s.on('conversation_deleted', () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });

        s.on('call-hold', ({ from }) => {
            setCallParticipants(prev => ({
                ...prev,
                [from]: { ...prev[from], status: 'hold' }
            }));
        });

        s.on('call-resume', ({ from }) => {
            setCallParticipants(prev => ({
                ...prev,
                [from]: { ...prev[from], status: 'active' }
            }));
        });

        s.on('new_message', (msg: unknown) => {
            const message = msg as Record<string, unknown>;
            if (message.senderId === user.id) return;
            // Add to notifications if not in the active room
            setChatNotifications(prev => [
                {
                    messageId: message.id as string,
                    conversationId: message.conversationId as string,
                    senderId: message.senderId as string,
                    senderName: message.senderName as string,
                    senderAvatar: message.senderAvatar as string | undefined,
                    content: message.content as string,
                    type: message.type as 'TEXT' | 'FILE' | 'IMAGE' | 'CALL',
                    createdAt: message.createdAt as string,
                    conversationType: message.conversationType as 'DIRECT' | 'GROUP',
                    conversationName: message.conversationName as string | undefined
                },
                ...prev
            ]);
        });

        s.on('status_update', (update: { userId: string; status: string; message?: string; messageExpiry?: string; lastSeen?: string }) => {
            setUserStatuses(prev => ({
                ...prev,
                [update.userId]: { status: update.status as UserStatusInfo['status'], message: update.message, messageExpiry: update.messageExpiry, lastSeen: update.lastSeen || new Date().toISOString() }
            }));
        });

        s.on('bulk_status_update', (statuses: Record<string, UserStatusInfo>) => {
            setUserStatuses(prev => ({ ...prev, ...statuses }));
        });

        setSocket(s);
        return () => {
            s.disconnect();
            socketRef.current = null;
            if (chatDismissTimerRef.current) {
                clearTimeout(chatDismissTimerRef.current);
            }
        };
    }, [user, fetchTotalUnread, cleanupCall, queryClient, setupPeerConnection, fetchParticipantInfo, socket]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (isCalling || activeCall) {
            timer = setInterval(() => {
                const talking = new Set<string>();
                analysers.current.forEach((a, uid) => {
                    const data = new Uint8Array(a.frequencyBinCount);
                    a.getByteFrequencyData(data);
                    const avg = data.reduce((p, c) => p + c, 0) / data.length;
                    if (avg > 30) talking.add(uid);
                });
                setSpeakingUsers(prev => {
                    if (prev.size === talking.size && Array.from(talking).every(u => prev.has(u))) return prev;
                    return talking;
                });
            }, 500); // Increased interval to 500ms for stability
        }
        return () => clearInterval(timer);
    }, [isCalling, activeCall]);

    const initiateCall = useCallback(async (to: string, name: string, type: 'audio' | 'video', conversationId?: string, isGroup?: boolean) => {
        if (!socketRef.current) return;
        if (activeCallRef.current) {
            showToast.error(t('chat.endCurrentCall'));
            return;
        }
        try {
            const isVideo = type === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
            setLocalStream(stream);
            localStreamRef.current = stream;
            const callObj = { to, name, type, conversationId, isGroup };
            setActiveCall(callObj);
            activeCallRef.current = callObj;
            setIsCalling(true);
            setIsVideoOff(!isVideo);
            callStartTime.current = Date.now();
            if (user) {
                monitorAudioLevel(user.id, stream);
                setCallParticipants(prev => ({
                    ...prev,
                    [user.id]: {
                        name: `${user.first_name || 'Me'} ${user.last_name || ''}`.trim(),
                        designation: user.job_title || user.role || 'Host',
                        avatar: resolveImageUrl(user.profile_photo_url || user.avatar)
                    }
                }));
            }

            if (isGroup && conversationId) {
                socketRef.current.emit('join_room', conversationId);
                socketRef.current.emit('group-call-started', { conversationId, type });
            } else {
                const pc = setupPeerConnection(to, stream, socketRef.current);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current.emit('call-user', { to, offer, type, conversationId });
                fetchParticipantInfo(to);
            }
            updateMyStatus('busy');
        } catch (err: unknown) {
            handleMediaError(err as Error);
            cleanupCall();
        }
    }, [user, monitorAudioLevel, setupPeerConnection, cleanupCall, fetchParticipantInfo, handleMediaError, updateMyStatus, t]);

    const acceptCall = useCallback(async () => {
        if (!incomingCall || !socketRef.current) return;
        const callData = { ...incomingCall };

        // Handle concurrent calls: Put existing call on hold
        if (activeCallRef.current) {
            const current = activeCallRef.current;
            setIsResuming(true);
            setHeldCall(current);
            socketRef.current?.emit('call-hold', {
                to: current.isGroup ? current.conversationId : current.to,
                isGroup: current.isGroup
            });
            // Stop tracks to release hardware for the new call
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            cleanupCall();
        }

        setIncomingCall(null);
        try {
            const isVideo = callData.type === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
            setIsResuming(false);
            setLocalStream(stream);
            localStreamRef.current = stream;
            setIsVideoOff(!isVideo);

            if (user) {
                monitorAudioLevel(user.id, stream);
                setCallParticipants(prev => ({
                    ...prev,
                    [user.id]: {
                        name: `${user.first_name || 'Me'} ${user.last_name || ''}`.trim(),
                        designation: user.job_title || user.role || 'Member',
                        avatar: resolveImageUrl(user.profile_photo_url || user.avatar)
                    }
                }));
            }

            const callObj = {
                to: callData.from, name: callData.callerName, type: callData.type,
                conversationId: callData.conversationId, isGroup: callData.isGroup
            };
            setActiveCall(callObj);
            activeCallRef.current = callObj;
            callStartTime.current = Date.now();

            if (callData.conversationId) {
                socketRef.current.emit('join_room', callData.conversationId);
                // If it's a group call, notify the group of our arrival to trigger mesh
                if (callData.isGroup) {
                    socketRef.current.emit('group-call-started', { conversationId: callData.conversationId, type: callData.type });
                }
            }

            const pc = setupPeerConnection(callData.from, stream, socketRef.current);
            if (callData.isGroup || !callData.offer) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current.emit('call-user', { to: callData.from, offer, type: 'video', conversationId: callData.conversationId });
            } else {
                await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socketRef.current.emit('answer-call', { to: callData.from, answer });
            }
            fetchParticipantInfo(callData.from);
            updateMyStatus('busy');
        } catch (err: unknown) {
            handleMediaError(err as Error);
            cleanupCall();
        }
    }, [user, incomingCall, monitorAudioLevel, setupPeerConnection, cleanupCall, fetchParticipantInfo, handleMediaError, updateMyStatus]);

    const joinActiveCall = useCallback(async (conversationId: string, type: 'audio' | 'video') => {
        if (!socketRef.current) return;

        // Handle concurrent calls: Leave current room before joining new one
        if (activeCallRef.current && activeCallRef.current.conversationId !== conversationId) {
            const current = activeCallRef.current;
            setIsResuming(true);
            setHeldCall(current);
            socketRef.current.emit('call-hold', {
                to: current.isGroup ? current.conversationId : current.to,
                isGroup: current.isGroup
            });
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            cleanupCall();
        }

        try {
            const isVideo = type === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
            setIsResuming(false);
            setLocalStream(stream);
            localStreamRef.current = stream;
            setIsVideoOff(!isVideo);

            if (user) {
                monitorAudioLevel(user.id, stream);
                setCallParticipants(prev => ({
                    ...prev,
                    [user.id]: {
                        name: `${user.first_name || 'Me'} ${user.last_name || ''}`.trim(),
                        designation: user.job_title || user.role || 'Member',
                        avatar: resolveImageUrl(user.profile_photo_url || user.avatar)
                    }
                }));
            }

            const callObj = { to: conversationId, name: 'Group Call', type, conversationId, isGroup: true };
            setActiveCall(callObj);
            activeCallRef.current = callObj;
            socketRef.current.emit('join_room', conversationId);
            socketRef.current.emit('group-call-started', { conversationId, type });
            updateMyStatus('busy');
        } catch (err: unknown) {
            handleMediaError(err as Error);
            cleanupCall();
        }
    }, [user, monitorAudioLevel, cleanupCall, handleMediaError, updateMyStatus]);

    const toggleVideo = useCallback(async () => {
        if (!localStreamRef.current || !socketRef.current) return;

        // If screen sharing is active, stop it first so we don't conflict tracks
        if (isScreenSharing) {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
            setIsScreenSharing(false);
            // Force localStream refresh
            if (localStreamRef.current) {
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }
        }

        const vt = localStreamRef.current.getVideoTracks()[0];
        if (!vt) {
            try {
                const vs = await navigator.mediaDevices.getUserMedia({ video: true });
                const track = vs.getVideoTracks()[0];
                localStreamRef.current.addTrack(track);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                peerConnections.current.forEach(async (pc, tid) => {
                    // Replace the video sender if one exists, otherwise add track
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(track);
                    } else {
                        pc.addTrack(track, localStreamRef.current!);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socketRef.current?.emit('call-user', { to: tid, offer, type: 'video', conversationId: activeCallRef.current?.conversationId });
                    }
                });
                setIsVideoOff(false);
            } catch (e: unknown) {
                handleMediaError(e as Error);
            }
        } else {
            vt.enabled = !vt.enabled;
            setIsVideoOff(!vt.enabled);
        }
    }, [isScreenSharing, handleMediaError]);

    const endCall = useCallback(() => {
        const active = activeCallRef.current;
        if (socketRef.current) {
            if (active?.isGroup && active.conversationId) {
                // For group calls, notify the entire room room
                socketRef.current.emit('end-call', { to: active.conversationId, isGroup: true });
            } else {
                const target = active?.to || incomingCall?.from;
                if (target) socketRef.current.emit('end-call', { to: target, isGroup: false });
            }
        }
        cleanupCall();

        // Automatic Resume Logic
        if (heldCallRef.current) {
            const h = heldCallRef.current;
            setHeldCall(null);
            setIsResuming(true);
            toast("Resuming previous call...", { icon: '🔄', duration: 3000 });
            setTimeout(async () => {
                try {
                    if (h.isGroup) {
                        await joinActiveCall(h.conversationId!, h.type);
                    } else {
                        // For 1-on-1 resume, we treat it like a new call but skip the "End current" check since cleanupCall already ran
                        const isVideo = h.type === 'video';
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
                        setLocalStream(stream);
                        localStreamRef.current = stream;
                        const callObj = { to: h.to, name: h.name, type: h.type, conversationId: h.conversationId, isGroup: false };
                        setActiveCall(callObj);
                        activeCallRef.current = callObj;
                        setIsVideoOff(!isVideo);
                        callStartTime.current = Date.now();

                        const pc = setupPeerConnection(h.to, stream, socketRef.current!);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socketRef.current!.emit('call-user', { to: h.to, offer, type: h.type, conversationId: h.conversationId });
                        fetchParticipantInfo(h.to);
                    }
                    socketRef.current?.emit('call-resume', {
                        to: h.isGroup ? h.conversationId : h.to,
                        isGroup: h.isGroup
                    });
                } catch (e) {
                    console.error("[Resume] Failed to resume", e);
                } finally {
                    setIsResuming(false);
                }
            }, 1000);
        }
    }, [incomingCall, cleanupCall, joinActiveCall, fetchParticipantInfo, setupPeerConnection]);

    const markAsRead = useCallback(async (id: string) => {
        try {
            await api.post(`/chat/conversations/${id}/read`);
            fetchTotalUnread();
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (e) { /* Swallow error intentionally */ }
    }, [fetchTotalUnread, queryClient]);

    const sendMessage = useCallback((room: string, message: Record<string, unknown>) => {
        socketRef.current?.emit('send_message', { room, ...message });
    }, []);

    const joinRoom = useCallback((room: string) => {
        socketRef.current?.emit('join_room', room);
    }, []);

    const sendTypingStatus = useCallback((id: string, isTyping: boolean) => {
        socketRef.current?.emit(isTyping ? 'typing_start' : 'typing_stop', id);
    }, []);

    const addParticipantToCall = useCallback((userId: string, userName: string) => {
        if (!socketRef.current) return;

        socketRef.current.emit('add-to-call', {
            to: userId,
            conversationId: activeCallRef.current?.conversationId,
            type: activeCallRef.current?.type || 'video',
            callerName: activeCallRef.current?.name || 'Group Call',
            isGroup: true
        });

        showToast.success(`Invitation sent to ${userName}`);
        fetchParticipantInfo(userId);
    }, [fetchParticipantInfo]);

    const stopScreenShare = useCallback(() => {
        if (!isScreenSharing) return;

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        setIsScreenSharing(false);

        // Force localStream state update so React re-renders the video element
        if (localStreamRef.current) {
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        const vt = localStreamRef.current?.getVideoTracks()[0];
        peerConnections.current.forEach(async (pc) => {
            try {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(vt || null);
                } else if (vt) {
                    pc.addTrack(vt, localStreamRef.current!);
                }
            } catch (e) {
                console.warn("[ScreenShare] Failed to revert track", e);
            }
        });
    }, [isScreenSharing]);

    const toggleScreenShare = useCallback(async () => {
        if (!socketRef.current) return;

        if (isScreenSharing) {
            stopScreenShare();
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = stream;
                const track = stream.getVideoTracks()[0];
                setIsScreenSharing(true);

                // CRITICAL: Use a stable reference to stopScreenShare to avoid stale closure
                track.onended = () => {
                    stopScreenShare();
                };

                peerConnections.current.forEach(async (pc, tid) => {
                    try {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) {
                            await sender.replaceTrack(track);
                        } else {
                            pc.addTrack(track, stream);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            socketRef.current?.emit('call-user', { to: tid, offer, type: 'video', conversationId: activeCallRef.current?.conversationId });
                        }
                    } catch (e: unknown) { console.error("[ScreenShare] PC sync failed", e); }
                });
            } catch (e: unknown) {
                handleMediaError(e as Error);
                setIsScreenSharing(false);
            }
        }
    }, [isScreenSharing, stopScreenShare, handleMediaError]);

    const [callDuration, setCallDuration] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (activeCall && !isCalling) { // Timer starts when it's an active call (accepted) and NOT in calling state
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [activeCall, isCalling]);

    const dismissChatNotification = useCallback((messageId: string) => {
        setChatNotifications(prev => prev.filter(n => n.messageId !== messageId));
    }, []);

    const setActiveConversation = useCallback((conversationId: string | null) => {
        activeConversationRef.current = conversationId;
    }, []);

    const contextValue = useMemo(() => ({
        socket, isConnected, sendMessage, joinRoom,
        isCalling, activeCall, incomingCall, localStream, remoteStreams,
        callParticipants, activeRoomCall,
        initiateCall, acceptCall, joinActiveCall, rejectCall: () => { if (incomingCall) socketRef.current?.emit('end-call', { to: incomingCall.from }); setIncomingCall(null); },
        endCall, isMuted, isVideoOff,
        toggleAudio: () => { if (localStreamRef.current) { const t = localStreamRef.current.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); } } },
        toggleVideo, markAsRead, logCall, totalUnreadCount, typingStatus, sendTypingStatus,
        isScreenSharing, toggleScreenShare, addParticipantToCall, speakingUsers,
        callDuration,
        chatNotifications, dismissChatNotification, setActiveConversation,
        heldCall, isResuming,
        myStatus,
        userStatuses,
        updateMyStatus,
        updateMyStatusMessage: (message: string, expiry: string | null) => {
            api.post('/chat/status-message', { message, expiry })
                .then(() => {
                    // Optimistic update
                    if (user) {
                        setUserStatuses(prev => ({
                            ...prev,
                            [user.id]: {
                                ...prev[user.id],
                                message,
                                expiry,
                                status: myStatus,
                                lastSeen: new Date().toISOString()
                            }
                        }));
                    }
                    socketRef.current?.emit('update_status', { message, messageExpiry: expiry });
                })
                .catch(err => console.error("Failed to update status message", err));
        }
    }), [
        socket, isConnected, sendMessage, joinRoom,
        isCalling, activeCall, incomingCall, localStream, remoteStreams,
        callParticipants, activeRoomCall,
        initiateCall, acceptCall, joinActiveCall, endCall, isMuted, isVideoOff,
        toggleVideo, markAsRead, logCall, totalUnreadCount, typingStatus,
        sendTypingStatus, isScreenSharing, toggleScreenShare, addParticipantToCall, speakingUsers,
        callDuration,
        chatNotifications, dismissChatNotification, setActiveConversation,
        heldCall, isResuming, myStatus, userStatuses, user,
        updateMyStatus
    ]);


    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat must be used within a ChatProvider');
    return context;
};
