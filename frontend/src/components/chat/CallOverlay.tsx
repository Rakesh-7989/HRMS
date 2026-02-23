import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
    Minimize2, Maximize2, Monitor, UserPlus, Search, X
} from 'lucide-react';
import { cn } from '@/utils/cn';
import api from '@/services/api';
import { formatDuration } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image';

// --- Remote Video Component ---
const RemoteVideo = ({ stream, userId, isTalking, participant, isScreenShare, theme }: { stream: MediaStream, userId: string, isTalking: boolean, participant?: { name: string, designation: string, avatar?: string }, isScreenShare?: boolean, theme: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const checkVideoState = () => {
            const videoTracks = stream.getVideoTracks();
            const hasActiveVideo = videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live');
            setIsVideoEnabled(hasActiveVideo);
            setIsLoading(false);
        };

        checkVideoState();
        const interval = setInterval(checkVideoState, 1000); // Poll for track state changes

        stream.onaddtrack = checkVideoState;
        stream.onremovetrack = checkVideoState;

        return () => {
            clearInterval(interval);
            stream.onaddtrack = null;
            stream.onremovetrack = null;
        };
    }, [stream]);

    const name = participant?.name || `User ${userId.slice(0, 4)}`;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className={cn(
            "relative w-full h-full rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group",
            theme === 'dark' ? "bg-gray-900 border border-white/5" : "bg-white border border-gray-200",
            isTalking ? "ring-2 ring-primary shadow-primary/20" : "",
            isScreenShare ? "bg-black" : ""
        )}>
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={cn(
                    "w-full h-full transition-opacity duration-500",
                    isScreenShare ? "object-contain" : "object-cover",
                    isVideoEnabled ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Fallback / Loading State */}
            {(!isVideoEnabled || isLoading) && (
                <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 transition-opacity duration-500",
                    theme === 'dark' ? "bg-gray-900/90" : "bg-gray-100/90"
                )}>
                    <div className="relative">
                        <div className={cn("w-24 h-24 rounded-full flex items-center justify-center text-3xl font-semibold shadow-xl overflow-hidden",
                            theme === 'dark'
                                ? "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 border border-white/10"
                                : "bg-gradient-to-br from-white to-gray-100 text-gray-600 border border-gray-200"
                        )}>
                            {participant?.avatar ? (
                                <img src={resolveImageUrl(participant.avatar)} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        {isTalking && (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-gray-900"></span>
                            </span>
                        )}
                    </div>
                    <div className="mt-4 text-center">
                        <h3 className={cn("font-medium tracking-tight text-lg", theme === 'dark' ? "text-white" : "text-gray-900")}>{name}</h3>
                        <p className={cn("text-xs mt-1 uppercase tracking-wider", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>{participant?.designation || 'Participant'}</p>
                        {!isVideoEnabled && !isLoading && (
                            <div className={cn(
                                "mt-3 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border",
                                theme === 'dark' ? "text-gray-500 bg-white/5 border-white/5" : "text-gray-500 bg-gray-200/50 border-gray-200"
                            )}>
                                <VideoOff size={10} /> CAMERA OFF
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Overlay Info (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-lg border shadow-lg",
                    theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white/80 border-gray-200"
                )}>
                    <span className={cn("w-2 h-2 rounded-full", isTalking ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                    <span className={cn("text-xs font-bold tracking-wide", theme === 'dark' ? "text-white" : "text-gray-900")}>{name}</span>
                </div>
            </div>
        </div>
    );
};


export const CallOverlay: React.FC = () => {
    const {
        incomingCall, activeCall, isCalling,
        localStream, remoteStreams, callParticipants,
        acceptCall, rejectCall, endCall,
        isMuted, isVideoOff, toggleAudio, toggleVideo,
        isScreenSharing, toggleScreenShare, addParticipantToCall,
        speakingUsers, callDuration, heldCall, isResuming
    } = useChat();

    const { user: currentUser } = useAuth();
    const { theme } = useTheme();
    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contacts, setContacts] = useState<any[]>([]);

    // Audio Refs
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // -- Effects --

    // Ringtone Management
    useEffect(() => {
        ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
        ringtoneRef.current.loop = true;
        return () => {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (incomingCall && ringtoneRef.current) {
            ringtoneRef.current.play().catch(console.warn);
        } else if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    }, [incomingCall]);

    // Local Video Stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isMinimized, isVideoOff]);

    // Contacts Fetching
    useEffect(() => {
        if (showAddModal) {
            api.get('/chat/contacts').then(res => setContacts(res.data.data)).catch(console.error);
        }
    }, [showAddModal]);


    // -- Render Logic --

    if (!incomingCall && !activeCall && !isCalling && !isResuming) return null;

    const targetName = activeCall?.name || heldCall?.name || 'Meeting';
    const remoteUserIds = Object.keys(remoteStreams);
    const filteredContacts = contacts.filter(c =>
        (c.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isDark = theme === 'dark';

    // -- Minimized View --
    if (isMinimized) {
        return (
            <div className={cn(
                "fixed bottom-6 right-6 z-[100] w-80 h-48 rounded-2xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-5 fade-in duration-300 group",
                isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
            )}>
                {/* Content */}
                <div className="absolute inset-0">
                    {remoteUserIds.length > 0 ? (
                        <RemoteVideo
                            stream={remoteStreams[remoteUserIds[0]]}
                            userId={remoteUserIds[0]}
                            isTalking={speakingUsers.has(remoteUserIds[0])}
                            participant={callParticipants[remoteUserIds[0]]}
                            theme={theme}
                        />
                    ) : (
                        <div className={cn("w-full h-full flex items-center justify-center", isDark ? "bg-gray-800 text-white/50" : "bg-gray-100 text-gray-400")}>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg uppercase">
                                    {targetName.charAt(0)}
                                </div>
                                <span className="text-xs font-medium uppercase tracking-widest opacity-70">On Hold</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-4 backdrop-blur-[1px] z-50">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-white shadow-sm truncate max-w-[150px] bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                            {targetName}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-colors cursor-pointer border border-white/20"
                            title="Maximize"
                        >
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="flex justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); toggleAudio(); }} className={cn("p-2 rounded-full transition-all active:scale-95 cursor-pointer", isMuted ? "bg-rose-500 text-white" : "bg-white/20 text-white hover:bg-white/30")}>
                            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); endCall(); }} className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all active:scale-95 shadow-lg cursor-pointer">
                            <PhoneOff size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -- Full Screen View --
    return (
        <div className={cn(
            "fixed inset-0 z-[100] overflow-hidden font-sans transition-colors duration-500",
            isDark ? "bg-[#0c0c0e] text-white" : "bg-gray-50 text-gray-900"
        )}>
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={cn(
                    "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-40",
                    isDark ? "bg-primary/10" : "bg-primary/5"
                )} />
                <div className={cn(
                    "absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-40",
                    isDark ? "bg-indigo-500/10" : "bg-indigo-500/5"
                )} />
            </div>

            {/* --- Incoming Call Modal --- */}
            {incomingCall && (
                <div className={cn(
                    "fixed inset-0 z-[150] backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300",
                    isDark ? "bg-black/80" : "bg-white/60"
                )}>
                    <div className={cn(
                        "border p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center relative overflow-hidden",
                        isDark ? "bg-gray-900 border-white/10" : "bg-white border-gray-200"
                    )}>
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-full pointer-events-none",
                            isDark ? "bg-gradient-to-b from-primary/5 to-transparent" : "bg-gradient-to-b from-blue-50 to-transparent"
                        )} />

                        <div className="relative mb-8">
                            <div className={cn(
                                "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border shadow-2xl",
                                isDark
                                    ? "bg-gradient-to-tr from-gray-800 to-gray-900 border-white/10"
                                    : "bg-gradient-to-tr from-white to-gray-50 border-gray-100"
                            )}>
                                <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-20" />
                                <span className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-800")}>{incomingCall.callerName?.charAt(0)}</span>
                            </div>
                            <h2 className={cn("text-3xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-gray-900")}>{incomingCall.callerName}</h2>
                            <p className="text-xs font-bold text-primary uppercase tracking-widest opacity-80">{incomingCall.type} Call Request</p>
                        </div>

                        <div className="flex items-center justify-center gap-8">
                            <button onClick={rejectCall} className="flex flex-col items-center gap-3 group">
                                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 active:scale-95">
                                    <PhoneOff size={28} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-rose-500 transition-colors">Decline</span>
                            </button>
                            <button onClick={acceptCall} className="flex flex-col items-center gap-3 group">
                                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:bg-emerald-400 transition-all duration-300 animate-pulse active:scale-95">
                                    <Phone size={32} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Accept</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Main Call Interface --- */}
            {(activeCall || isCalling || isResuming) && (
                <div className="flex flex-col h-full relative">
                    {/* Header */}
                    <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-6">
                            <div className={cn(
                                "flex items-center gap-3 py-2.5 px-5 rounded-full shadow-lg backdrop-blur-xl border",
                                isDark
                                    ? "bg-black/40 border-white/10"
                                    : "bg-white/80 border-white/40 shadow-gray-200/50"
                            )}>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className={cn("text-sm font-bold tabular-nums tracking-wide", isDark ? "text-white" : "text-gray-900")}>{formatDuration(callDuration)}</span>
                                </div>
                                <div className={cn("w-px h-4", isDark ? "bg-white/10" : "bg-gray-300")} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-gray-400" : "text-gray-500")}>
                                    {remoteUserIds.length + 1} Active
                                </span>
                            </div>

                            {heldCall && (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    {heldCall.name} On Hold
                                </div>
                            )}
                        </div>

                        <div className="pointer-events-auto">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className={cn(
                                    "group flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl rounded-full transition-all shadow-lg active:scale-95 border",
                                    isDark
                                        ? "bg-black/40 hover:bg-white/10 border-white/10"
                                        : "bg-white/80 hover:bg-white border-white/40 shadow-gray-200/50"
                                )}
                            >
                                <Minimize2 size={16} className={cn("transition-colors", isDark ? "text-gray-400 group-hover:text-white" : "text-gray-500 group-hover:text-gray-900")} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", isDark ? "text-gray-400 group-hover:text-white" : "text-gray-500 group-hover:text-gray-900")}>Minimize</span>
                            </button>
                        </div>
                    </header>

                    {/* Main Grid */}
                    <main className="flex-1 p-6 pt-24 pb-32 flex items-center justify-center overflow-hidden">
                        {remoteUserIds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-1000 relative z-10 transition-colors duration-500">
                                {/* Ambient Glow behind avatar */}
                                <div className={cn(
                                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-colors",
                                    isDark ? "bg-primary/20" : "bg-primary/10"
                                )} />

                                <div className={cn(
                                    "w-40 h-40 rounded-[2.5rem] p-1 flex items-center justify-center shadow-2xl mb-8 relative group border",
                                    isDark
                                        ? "bg-gradient-to-tr from-gray-800 to-gray-900 border-white/10"
                                        : "bg-gradient-to-tr from-white to-gray-50 border-white"
                                )}>
                                    <div className={cn(
                                        "w-full h-full rounded-[2.2rem] overflow-hidden relative transition-colors",
                                        isDark ? "bg-black/50" : "bg-gray-100"
                                    )}>
                                        {currentUser?.profile_photo_url ? (
                                            <img src={resolveImageUrl(currentUser.profile_photo_url)} alt="You" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                                        ) : (
                                            <div className={cn("w-full h-full flex items-center justify-center text-5xl font-bold", isDark ? "text-white/20" : "text-gray-300")}>
                                                {currentUser?.first_name?.[0]}
                                            </div>
                                        )}
                                        {/* Scanline effect */}
                                        <div className={cn(
                                            "absolute inset-0 opacity-30 animate-scan",
                                            isDark
                                                ? "bg-gradient-to-b from-transparent via-white/5 to-transparent"
                                                : "bg-gradient-to-b from-transparent via-gray-900/5 to-transparent"
                                        )} />
                                    </div>
                                    {/* Ripple Rings */}
                                    <div className="absolute inset-0 rounded-[2.5rem] border border-primary/30 animate-[ping_3s_ease-in-out_infinite]" />
                                    <div className="absolute inset-0 rounded-[2.5rem] border border-primary/10 animate-[ping_3s_ease-in-out_infinite_1.5s]" />
                                </div>

                                <h3 className={cn(
                                    "text-3xl font-bold mb-3 tracking-tight bg-clip-text text-transparent",
                                    isDark
                                        ? "bg-gradient-to-b from-white to-white/60"
                                        : "bg-gradient-to-b from-gray-900 to-gray-600"
                                )}>Waiting for others...</h3>
                                <div className={cn(
                                    "flex items-center gap-3 px-6 py-2 rounded-full backdrop-blur-md border",
                                    isDark
                                        ? "bg-white/5 border-white/5"
                                        : "bg-white/50 border-gray-200"
                                )}>
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className={cn("text-sm font-bold tracking-wide", isDark ? "text-white/80" : "text-gray-600")}>{activeCall?.name || 'Workspace'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className={cn(
                                "grid gap-4 md:gap-6 w-full max-w-[1800px] h-full transition-all duration-700 ease-spring px-4 md:px-0",
                                remoteUserIds.length === 1 ? "grid-cols-1 max-h-[90vh]" :
                                    remoteUserIds.length === 2 ? "grid-cols-1 md:grid-cols-2 max-h-[90vh] md:max-h-[80vh]" :
                                        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-[85vh] overflow-y-auto"
                            )}>
                                {remoteUserIds.map(uid => (
                                    <div key={uid} className="relative w-full h-full min-h-[300px]">
                                        <RemoteVideo
                                            stream={remoteStreams[uid]}
                                            userId={uid}
                                            isTalking={speakingUsers.has(uid)}
                                            participant={callParticipants[uid]}
                                            isScreenShare={isScreenSharing}
                                            theme={theme}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>

                    {/* Controls Bar */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-fit px-4">
                        <div className={cn(
                            "flex items-center gap-4 p-3 pr-4 backdrop-blur-2xl border rounded-[2.5rem] shadow-2xl transition-colors duration-300",
                            isDark
                                ? "bg-[#0c0c0e]/80 border-white/10 hover:bg-[#0c0c0e]/90"
                                : "bg-white/80 border-white/40 shadow-gray-200/50 hover:bg-white/90"
                        )}>

                            <div className={cn("flex items-center gap-2 px-2 border-r", isDark ? "border-white/10" : "border-gray-200")}>
                                {/* Mic */}
                                <button
                                    onClick={toggleAudio}
                                    className={cn(
                                        "w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all duration-300 active:scale-90 group",
                                        isMuted
                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                                            : isDark
                                                ? "bg-white/5 text-white hover:bg-white/10"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    )}
                                    title="Toggle Mic"
                                >
                                    {isMuted ? <MicOff size={24} /> : <Mic size={24} className="group-hover:scale-110 transition-transform" />}
                                </button>

                                {/* Camera */}
                                <button
                                    onClick={toggleVideo}
                                    className={cn(
                                        "w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all duration-300 active:scale-90 group",
                                        isVideoOff
                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                                            : isDark
                                                ? "bg-white/5 text-white hover:bg-white/10"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    )}
                                    title="Toggle Camera"
                                >
                                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} className="group-hover:scale-110 transition-transform" />}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-2">
                                {/* Screen Share */}
                                <button
                                    onClick={toggleScreenShare}
                                    className={cn(
                                        "w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all duration-300 active:scale-90 group",
                                        isScreenSharing
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                            : isDark
                                                ? "bg-white/5 text-indigo-300 hover:bg-white/10"
                                                : "bg-gray-100 text-indigo-500 hover:bg-gray-200"
                                    )}
                                    title="Share Screen"
                                >
                                    <Monitor size={24} className="group-hover:scale-110 transition-transform" />
                                </button>

                                {/* Add User */}
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className={cn(
                                        "w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all duration-300 active:scale-90 group",
                                        isDark
                                            ? "bg-white/5 text-teal-300 hover:bg-white/10"
                                            : "bg-gray-100 text-teal-600 hover:bg-gray-200"
                                    )}
                                    title="Invite People"
                                >
                                    <UserPlus size={24} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* End Call (Distinct) */}
                            <button
                                onClick={endCall}
                                className="h-14 px-8 rounded-[2rem] flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-700 transition-all duration-300 shadow-xl shadow-rose-600/30 ml-2 active:scale-95 group"
                                title="End Call"
                            >
                                <PhoneOff size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-bold text-sm tracking-wide hidden sm:inline">END</span>
                            </button>
                        </div>
                    </div>

                    {/* Local Video Picture-in-Picture */}
                    {localStream && (
                        <div className={cn(
                            "absolute z-20 transition-all duration-500 group",
                            isScreenSharing ? "top-24 right-6 w-80 aspect-video" : "top-24 right-6 w-72 aspect-[3/4] md:aspect-video"
                        )}>
                            <div className={cn(
                                "w-full h-full rounded-3xl overflow-hidden shadow-2xl border transition-colors",
                                isDark ? "bg-[#18181b] border-white/10" : "bg-white border-white/40"
                            )}>
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={cn(
                                        "w-full h-full object-cover transform -scale-x-100",
                                        isVideoOff ? "hidden" : "block"
                                    )}
                                />
                                {isVideoOff && (
                                    <div className={cn(
                                        "absolute inset-0 flex flex-col items-center justify-center",
                                        isDark ? "bg-[#18181b]" : "bg-gray-100"
                                    )}>
                                        <div className={cn(
                                            "w-16 h-16 rounded-full flex items-center justify-center mb-3",
                                            isDark ? "bg-white/5" : "bg-white shadow-sm"
                                        )}>
                                            <VideoOff size={24} className={cn("", isDark ? "text-white/40" : "text-gray-400")} />
                                        </div>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-white/40" : "text-gray-400")}>Camera Off</span>
                                    </div>
                                )}
                                <div className={cn(
                                    "absolute bottom-3 left-3 px-3 py-1.5 backdrop-blur-md rounded-xl border opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                    isDark ? "bg-black/60 border-white/5" : "bg-white/80 border-gray-200"
                                )}>
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-white" : "text-gray-900")}>You</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- Add Participant Modal --- */}
            {showAddModal && (
                <div className={cn(
                    "fixed inset-0 z-[160] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300",
                    isDark ? "bg-black/80" : "bg-white/60"
                )}>
                    <div className={cn(
                        "w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]",
                        isDark ? "bg-[#121214] border-white/10" : "bg-white border-gray-200"
                    )}>
                        <div className={cn(
                            "p-8 pb-4 border-b flex justify-between items-center",
                            isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                        )}>
                            <div>
                                <h3 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>Invite Team</h3>
                                <p className={cn("text-xs font-bold uppercase tracking-widest mt-1", isDark ? "text-gray-500" : "text-gray-500")}>Select people to join</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className={cn(
                                "p-3 rounded-full transition-colors",
                                isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                            )}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-hidden flex flex-col">
                            <div className="relative mb-6">
                                <Search className={cn("absolute left-5 top-1/2 -translate-y-1/2", isDark ? "text-primary" : "text-gray-400")} size={20} />
                                <input
                                    type="text"
                                    placeholder="SEARCH BY NAME..."
                                    className={cn(
                                        "w-full border rounded-2xl py-4 pl-14 pr-4 transition-all text-sm font-medium focus:outline-none focus:ring-2 placeholder:text-xs placeholder:font-bold placeholder:tracking-widest",
                                        isDark
                                            ? "bg-black/30 border-white/10 text-white focus:ring-primary/50 placeholder:text-gray-600"
                                            : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-primary/20 placeholder:text-gray-400"
                                    )}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {filteredContacts.map(contact => (
                                    <div key={contact.id} className={cn(
                                        "flex items-center justify-between p-4 rounded-3xl transition-all group border border-transparent",
                                        isDark ? "hover:bg-white/5 hover:border-white/5" : "hover:bg-gray-50 hover:border-gray-100"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border shadow-inner",
                                                isDark
                                                    ? "bg-gradient-to-tr from-gray-800 to-gray-700 text-white border-white/5"
                                                    : "bg-gradient-to-tr from-gray-100 to-white text-gray-800 border-gray-200"
                                            )}>
                                                {contact.profile_photo_url ? (
                                                    <img src={resolveImageUrl(contact.profile_photo_url)} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                ) : contact.first_name?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-bold transition-colors",
                                                    isDark ? "text-white group-hover:text-primary" : "text-gray-900 group-hover:text-primary"
                                                )}>{contact.first_name} {contact.last_name}</p>
                                                <p className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider",
                                                    isDark ? "text-gray-500" : "text-gray-400"
                                                )}>{contact.designation || contact.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!contact.id) {
                                                    import('react-hot-toast').then(t => t.toast.error("Cannot invite: Invalid User ID"));
                                                    return;
                                                }
                                                addParticipantToCall(contact.id, `${contact.first_name} ${contact.last_name}`);
                                                setShowAddModal(false);
                                            }}
                                            className={cn(
                                                "px-5 py-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 uppercase tracking-wide",
                                                isDark
                                                    ? "bg-white/5 hover:bg-primary text-gray-300 hover:text-white"
                                                    : "bg-gray-100 hover:bg-primary text-gray-600 hover:text-white"
                                            )}
                                        >
                                            Invite
                                        </button>
                                    </div>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center gap-3 opacity-50">
                                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", isDark ? "bg-white/5" : "bg-gray-100")}>
                                            <Search size={24} />
                                        </div>
                                        <p className="text-sm font-medium">No team members found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(${isDark ? '255,255,255' : '0,0,0'},0.1); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(${isDark ? '255,255,255' : '0,0,0'},0.2); }
                `
            }} />
        </div>
    );
};
