import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
    Minimize2, Monitor, UserPlus, Search, X
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
            "relative w-full h-full bg-gray-900 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 shadow-elev-6 group",
            isTalking ? "border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.3)]" : "border-white/5"
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
                        <div className={cn("w-24 h-24 rounded-full flex items-center justify-center text-3xl font-semibold shadow-elev-5 overflow-hidden",
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

            {/* User Label */}
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl text-[12px] font-bold text-white/90 flex items-center gap-3 border border-white/10 shadow-elev-4 group-hover:bottom-8 transition-all">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-elev-4", isTalking ? "bg-emerald-500 animate-pulse" : "bg-gray-500")} />
                <div className="flex flex-col">
                    <span className="leading-tight text-white">{name}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{participant?.designation || 'Participant'}</span>
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
    const isDark = theme === 'dark';
    const localInitials = currentUser?.first_name?.charAt(0) || '';

    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contacts, setContacts] = useState<any[]>([]);

    const filteredContacts = contacts.filter(c =>
        `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

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


    const incomingBar = incomingCall && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 animate-in slide-in-from-top-10 duration-500">
            <div className="bg-gray-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-2 flex items-center justify-between">
                <div className="flex items-center gap-4 pl-4 pr-2 py-2">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center text-white text-xl font-black shadow-elev-4 border border-white/10 overflow-hidden">
                            {incomingCall.callerName?.charAt(0) || '?'}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm tracking-tight">{incomingCall.callerName || 'Incoming Call'}</span>
                        <div className="flex items-center gap-2 text-brand-500 text-[10px] font-black uppercase tracking-widest opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                            {incomingCall.type} call...
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2">
                    <button onClick={rejectCall} className="w-12 h-12 rounded-2xl bg-error-500/10 text-error-500 hover:bg-error-500 hover:text-white transition-all duration-300 flex items-center justify-center border border-error-500/20" title="Decline">
                        <PhoneOff size={20} />
                    </button>
                    <button onClick={acceptCall} className="px-6 h-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-300 flex items-center gap-2 font-black text-xs tracking-widest shadow-elev-4 shadow-emerald-500/20 active:scale-95">
                        <Phone size={18} /> ACCEPT
                    </button>
                </div>
            </div>
        </div>
    );

    if (isMinimized) {
        return (
            <>
                {incomingBar}
                <div className="fixed bottom-8 right-8 z-[110] w-80 h-48 bg-gray-950 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden border-2 border-brand-500/40 group animate-in slide-in-from-bottom-10 duration-500">
                    <div className="absolute inset-0">
                        {remoteUserIds.length > 0 ? (
                            <RemoteVideo
                                stream={remoteStreams[remoteUserIds[0]]}
                                userId={remoteUserIds[0]}
                                isTalking={speakingUsers.has(remoteUserIds[0])}
                                participant={callParticipants[remoteUserIds[0]]}
                                isScreenShare={isScreenSharing}
                                theme={theme}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-3xl font-black text-brand-500 border-2 border-brand-500/40">
                                    {targetName.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
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
                    isDark ? "bg-brand-500/10" : "bg-brand-500/5"
                )} />
                <div className={cn(
                    "absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-40",
                    isDark ? "bg-brand-500/10" : "bg-brand-500/5"
                )} />
            </div>

            {/* --- Incoming Call Modal --- */}
            {incomingCall && (
                <div className={cn(
                    "fixed inset-0 z-[150] backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300",
                    isDark ? "bg-black/80" : "bg-white/60"
                )}>
                    <div className={cn(
                        "border p-10 rounded-[2.5rem] shadow-elev-6 max-w-sm w-full text-center relative overflow-hidden",
                        isDark ? "bg-gray-900 border-white/10" : "bg-white border-gray-200"
                    )}>
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-full pointer-events-none",
                            isDark ? "bg-gradient-to-b from-brand-500/5 to-transparent" : "bg-gradient-to-b from-blue-50 to-transparent"
                        )} />

                        <div className="relative mb-8">
                            <div className={cn(
                                "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border shadow-elev-6",
                                isDark
                                    ? "bg-gradient-to-tr from-gray-800 to-gray-900 border-white/10"
                                    : "bg-gradient-to-tr from-white to-gray-50 border-gray-100"
                            )}>
                                <span className="absolute inset-0 rounded-full border border-brand-500/30 animate-ping opacity-20" />
                                <span className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-800")}>{incomingCall.callerName?.charAt(0)}</span>
                            </div>
                            <h2 className={cn("text-3xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-gray-900")}>{incomingCall.callerName}</h2>
                            <p className="text-xs font-bold text-brand-500 uppercase tracking-widest opacity-80">{incomingCall.type} Call Request</p>
                        </div>

                        <div className="flex items-center justify-center gap-8">
                            <button onClick={rejectCall} className="flex flex-col items-center gap-3 group">
                                <div className="w-16 h-16 rounded-full bg-error-500/10 text-error-500 flex items-center justify-center border border-error-500/20 group-hover:bg-error-500 group-hover:text-white transition-all duration-300 active:scale-95">
                                    <PhoneOff size={28} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-error-500 transition-colors">Decline</span>
                            </button>
                            <button onClick={acceptCall} className="flex flex-col items-center gap-3 group">
                                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-elev-4 shadow-emerald-500/40 group-hover:scale-110 group-hover:bg-emerald-400 transition-all duration-300 animate-pulse active:scale-95">
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
                                "flex items-center gap-3 py-2.5 px-5 rounded-full shadow-elev-4 backdrop-blur-xl border",
                                isDark
                                    ? "bg-black/40 border-white/10"
                                    : "bg-white/80 border-white/40 shadow-gray-200/50"
                            )}>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-error-500 animate-pulse" />
                                    <span className={cn("text-sm font-bold tabular-nums tracking-wide", isDark ? "text-white" : "text-gray-900")}>{formatDuration(callDuration)}</span>
                                </div>
                                <div className={cn("w-px h-4", isDark ? "bg-white/10" : "bg-gray-300")} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-gray-400" : "text-gray-500")}>
                                    {remoteUserIds.length + 1} Active
                                </span>
                            </div>

                            {heldCall && (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-elev-4 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    {heldCall.name} On Hold
                                </div>
                            )}
                        </div>

                        <div className="pointer-events-auto">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className={cn(
                                    "group flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl rounded-full transition-all shadow-elev-4 active:scale-95 border",
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
                                    isDark ? "bg-brand-500/20" : "bg-brand-500/10"
                                )} />

                                <div className={cn(
                                    "w-40 h-40 rounded-[2.5rem] p-1 flex items-center justify-center shadow-elev-6 mb-8 relative group border",
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
                                    <div className="absolute inset-0 rounded-[2.5rem] border border-brand-500/30 animate-[ping_3s_ease-in-out_infinite]" />
                                    <div className="absolute inset-0 rounded-[2.5rem] border border-brand-500/10 animate-[ping_3s_ease-in-out_infinite_1.5s]" />
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

                    {/* Action Bar */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3 p-4 bg-gray-900/40 backdrop-blur-[50px] rounded-[3.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-20 transition-all duration-500 hover:scale-[1.02] hover:bg-gray-900/60">
                        <div className="flex items-center gap-2 px-4 border-r border-white/10">
                            <button
                                onClick={toggleAudio}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isMuted ? "bg-error-500 text-white shadow-elev-6 shadow-error-500/30" : "hover:bg-white/10 text-white"
                                )}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff size={30} /> : <Mic size={30} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isVideoOff ? "bg-error-500 text-white shadow-elev-6 shadow-error-500/30" : "text-brand-500 hover:bg-white/10"
                                )}
                                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                            >
                                {isVideoOff ? <VideoOff size={30} /> : <Video size={30} />}
                            </button>
                            <button
                                onClick={toggleScreenShare}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isScreenSharing ? "bg-emerald-500 text-white shadow-elev-6 shadow-emerald-500/30" : "text-brand-400 hover:bg-white/10"
                                )}
                                title="Share Screen"
                            >
                                <Monitor size={30} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 px-4">
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

                            {/* End Call (Distinct) */}
                            <button
                                onClick={endCall}
                                className="h-14 px-8 rounded-[2rem] flex items-center justify-center gap-2 bg-error-500 text-white hover:bg-error-600 transition-all duration-300 shadow-elev-5 shadow-error-600/30 ml-2 active:scale-95 group"
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
                            "absolute transition-all duration-1000 shadow-elev-6 z-30 group overflow-hidden bg-gray-950",
                            isScreenSharing ? "top-12 right-12 w-96 aspect-video border-4 border-emerald-500 rounded-3xl" : "top-12 right-12 w-80 aspect-video border-2 border-white/10 rounded-[2.5rem]"
                        )}>
                            {isScreenSharing && (
                                <div className="absolute top-5 left-5 z-40 px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-2 shadow-elev-5 shadow-emerald-500/20">
                                    <Monitor size={16} /> YOU ARE SHARING
                                </div>
                            )}
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={cn(
                                    "w-full h-full mirror transition-all duration-1000",
                                    isScreenSharing ? "object-contain" : "object-cover hover:scale-105",
                                    isVideoOff && "opacity-0"
                                )}
                            />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner overflow-hidden border-2 border-white/20">
                                        {currentUser?.profile_photo_url ? (
                                            <img src={currentUser.profile_photo_url} alt="Local User" className="w-full h-full object-cover opacity-50 transition-all duration-700" />
                                        ) : (
                                            <span className="text-2xl font-black text-white/20 drop-shadow-lg">{localInitials}</span>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <VideoOff size={40} className="text-white/20" />
                                        </div>
                                    </div>
                                    <span className={cn("text-[10px] font-bold uppercase tracking-widest mt-2", isDark ? "text-white/40" : "text-gray-400")}>Camera Off</span>
                                </div>
                            )}
                            <div className={cn(
                                "absolute bottom-3 left-3 px-3 py-1.5 backdrop-blur-md rounded-xl border opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                isDark ? "bg-black/60 border-white/5" : "bg-white/80 border-gray-200"
                            )}>
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-white" : "text-gray-900")}>You</span>
                            </div>
                            {speakingUsers.has(currentUser?.id || '') && (
                                <div className="absolute top-5 right-5 w-4 h-4 bg-emerald-500 rounded-full animate-ping z-40" />
                            )}
                        </div>
                    )}

                    {showAddModal && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-[40px] animate-in fade-in duration-500">
                            <div className="bg-gray-900 w-full max-w-xl rounded-[3.5rem] border border-white/10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.6)]">
                                <div className="p-12 border-b border-white/5 flex justify-between items-center bg-white/5">
                                    <div>
                                        <h3 className="text-4xl font-black tracking-tight mb-2 italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Invite Team</h3>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Build your meeting workspace</p>
                                    </div>
                                    <button onClick={() => setShowAddModal(false)} className="p-5 hover:bg-white/5 rounded-3xl transition-all active:scale-90 border border-white/10">
                                        <X size={32} />
                                    </button>
                                </div>
                                <div className="p-12">
                                    <div className="relative mb-10">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-500 opacity-50" size={28} />
                                        <input
                                            type="text"
                                            placeholder="SEARCH TEAM MEMBERS..."
                                            className="w-full bg-[#151518] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all font-black text-sm tracking-widest placeholder:text-gray-700"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[450px] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                                        {filteredContacts.map(contact => (
                                            <div key={contact.id} className="flex items-center justify-between p-6 hover:bg-white/5 rounded-[2.5rem] transition-all group border border-transparent hover:border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-18 h-18 rounded-[1.5rem] bg-gradient-to-tr from-brand-500/20 to-brand-500/20 flex items-center justify-center text-brand-500 font-black text-3xl border border-brand-500/20 shadow-inner overflow-hidden">
                                                        {contact.profile_photo_url ? (
                                                            <img src={contact.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            contact.first_name?.[0].toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-xl tracking-tight leading-none mb-2">{contact.first_name} {contact.last_name}</div>
                                                        <div className="text-[10px] text-gray-500 font-black tracking-widest uppercase">{contact.designation || contact.job_title || contact.email}</div>
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
                                                    className="p-5 bg-brand-500 text-white hover:bg-brand-500/80 rounded-[1.8rem] transition-all shadow-elev-6 shadow-brand-500/30 active:scale-95 border-b-4 border-brand-500-dark"
                                                >
                                                    <UserPlus size={30} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
