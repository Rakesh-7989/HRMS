import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Minus, Maximize2, Monitor, UserPlus, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import api from '@/services/api';

// Move RemoteVideo outside the main component to prevent unmounting on every render
const RemoteVideo = ({ stream, userId, isTalking, participant }: { stream: MediaStream, userId: string, isTalking: boolean, participant?: { name: string, designation: string, avatar?: string } }) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasVideo, setHasVideo] = useState(false);
    const videoActiveRef = useRef(false);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const videoDevice = ref.current;
        if (!videoDevice) return;

        videoDevice.srcObject = stream;

        const updateTrackState = () => {
            const tracks = stream.getVideoTracks();
            const isActive = tracks.length > 0 && tracks.some(t => t.enabled && t.readyState === 'live');

            if (isActive) {
                // Video is live: show immediately and clear any hide timer
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }
                setHasVideo(true);
                setIsLoaded(true);
                videoActiveRef.current = true;
            } else {
                // Video is gone: Add a 1.5s delay (hysteresis) to prevent blinking during negotiation
                if (videoActiveRef.current && !hideTimeoutRef.current) {
                    hideTimeoutRef.current = setTimeout(() => {
                        setHasVideo(false);
                        videoActiveRef.current = false;
                        hideTimeoutRef.current = null;
                    }, 1500);
                } else if (!videoActiveRef.current) {
                    setHasVideo(false);
                }
            }
        };

        updateTrackState();
        stream.onaddtrack = updateTrackState;
        stream.onremovetrack = updateTrackState;
        videoDevice.onloadedmetadata = () => {
            setIsLoaded(true);
            updateTrackState();
        };

        const interval = setInterval(updateTrackState, 1000);
        return () => {
            clearInterval(interval);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            stream.onaddtrack = null;
            stream.onremovetrack = null;
        };
    }, [stream]);

    const showOverlay = !hasVideo;
    const name = participant?.name || `User ${userId.slice(0, 4)}`;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className={cn(
            "relative w-full h-full bg-gray-900 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 shadow-2xl group",
            isTalking ? "border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.3)]" : "border-white/5"
        )}>
            <video
                ref={ref}
                autoPlay
                playsInline
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-1000",
                    hasVideo ? "opacity-100" : "opacity-0"
                )}
            />

            {showOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-[#0a0a0c]">
                    {!isLoaded && hasVideo ? (
                        <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin shadow-2xl" />
                    ) : (
                        <>
                            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 relative overflow-hidden ring-8 ring-white/5">
                                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-10" />
                                {participant?.avatar ? (
                                    <img src={participant.avatar} alt={name} className="w-full h-full object-cover shadow-2xl" />
                                ) : (
                                    <span className="text-5xl font-black text-primary drop-shadow-lg">
                                        {initials}
                                    </span>
                                )}
                            </div>
                            <div className="mt-8 flex flex-col items-center gap-2 px-6 text-center">
                                <div className="text-2xl font-black text-white/90 tracking-tight leading-none mb-1">{name}</div>
                                <div className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase mb-4">{participant?.designation || 'Team Member'}</div>
                                <div className="px-5 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-black tracking-[0.3em] text-rose-400 uppercase">
                                    Camera Off
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* User Label */}
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl text-[12px] font-bold text-white/90 flex items-center gap-3 border border-white/10 shadow-lg group-hover:bottom-8 transition-all">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", isTalking ? "bg-emerald-500 animate-pulse" : "bg-gray-500")} />
                <div className="flex flex-col">
                    <span className="leading-tight text-white">{name}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{participant?.designation || 'Participant'}</span>
                </div>
            </div>

            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                    <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin shadow-2xl" />
                </div>
            )}
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
        speakingUsers
    } = useChat();
    const { user: currentUser } = useAuth();

    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contacts, setContacts] = useState<any[]>([]);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Initialize ringtone
    useEffect(() => {
        ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'); // Professional ringing sound
        ringtoneRef.current.loop = true;
        return () => {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }
        };
    }, []);

    // Handle ringtone playback
    useEffect(() => {
        if (incomingCall && ringtoneRef.current) {
            ringtoneRef.current.play().catch(e => console.warn("Ringtone blocked by browser autoplay policy", e));
        } else if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    }, [incomingCall]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isMinimized]);

    useEffect(() => {
        if (showAddModal) {
            api.get('/chat/contacts').then(res => setContacts(res.data.data)).catch(console.error);
        }
    }, [showAddModal]);

    if (!incomingCall && !activeCall && !isCalling) return null;

    const targetName = activeCall?.name || 'Unknown';
    const remoteUserIds = Object.keys(remoteStreams);
    const someoneSharing = isScreenSharing;

    const incomingBar = incomingCall && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 animate-in slide-in-from-top-10 duration-500">
            <div className="bg-gray-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-2 flex items-center justify-between">
                <div className="flex items-center gap-4 pl-4 pr-2 py-2">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg border border-white/10 overflow-hidden">
                            {incomingCall.callerName?.charAt(0) || '?'}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm tracking-tight">{incomingCall.callerName || 'Incoming Call'}</span>
                        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {incomingCall.type} call...
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2">
                    <button onClick={rejectCall} className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 flex items-center justify-center border border-rose-500/20" title="Decline">
                        <PhoneOff size={20} />
                    </button>
                    <button onClick={acceptCall} className="px-6 h-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-300 flex items-center gap-2 font-black text-xs tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95">
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
                <div className="fixed bottom-8 right-8 z-[110] w-80 h-48 bg-gray-950 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden border-2 border-primary/40 group animate-in slide-in-from-bottom-10 duration-500">
                    <div className="absolute inset-0">
                        {remoteUserIds.length > 0 ? (
                            <RemoteVideo
                                stream={remoteStreams[remoteUserIds[0]]}
                                userId={remoteUserIds[0]}
                                isTalking={speakingUsers.has(remoteUserIds[0])}
                                participant={callParticipants[remoteUserIds[0]]}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-black text-primary border-2 border-primary/40">
                                    {targetName.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-5 backdrop-blur-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">ON CALL</span>
                                <span className="text-sm font-bold text-white truncate max-w-[140px] tracking-tight">{targetName}</span>
                            </div>
                            <button onClick={() => setIsMinimized(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90">
                                <Maximize2 size={20} className="text-white" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={toggleAudio} className={cn("p-3 rounded-2xl transition-all", isMuted ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-white/10 hover:bg-white/20 text-white")}>
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <button onClick={endCall} className="p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 active:scale-90">
                                <PhoneOff size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const filteredContacts = contacts.filter(c =>
        `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase().includes(searchQuery.toLowerCase())
    );

    const localUserName = `${currentUser?.first_name} ${currentUser?.last_name}`;
    const localInitials = localUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            {incomingBar}
            {(activeCall || isCalling) && (
                <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col items-center justify-center text-white overflow-hidden animate-in fade-in zoom-in-[1.05] duration-1000">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />

                    {/* Top Bar Indicators */}
                    <div className="absolute top-12 left-12 right-12 flex justify-between items-center z-20">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-3xl transition-all duration-300 flex items-center gap-4 text-xs font-black tracking-[0.2em] border border-white/10 hover:border-white/20 active:scale-95"
                        >
                            <Minus size={22} className="text-primary" />
                            MINIMIZE
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                                    {remoteUserIds.length + 1} ACTIVE PARTICIPANTS
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Call Grid */}
                    <div className={cn(
                        "w-full h-full p-40 transition-all duration-1000 flex items-center justify-center",
                        someoneSharing ? "max-w-full p-20" : "max-w-[1500px]"
                    )}>
                        {remoteUserIds.length === 0 ? (
                            <div className="flex flex-col items-center gap-14 animate-in fade-in zoom-in-95 duration-1000">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-[90px] animate-pulse" />
                                    <div className="relative w-64 h-64 rounded-[4.5rem] bg-gradient-to-tr from-gray-900 to-gray-800 flex items-center justify-center text-[120px] font-black border-4 border-primary/40 shadow-[0_0_80px_rgba(var(--primary-rgb),0.3)] overflow-hidden">
                                        {currentUser?.profile_photo_url ? (
                                            <img src={currentUser.profile_photo_url} alt="Local User" className="w-full h-full object-cover shadow-2xl" />
                                        ) : (
                                            <span className="drop-shadow-2xl">{targetName.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h2 className="text-6xl font-black tracking-tighter mb-4 animate-pulse bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">Waiting for others...</h2>
                                    <p className="text-primary font-black text-2xl uppercase tracking-[0.4em] opacity-80">{activeCall?.name}</p>
                                </div>
                            </div>
                        ) : (
                            <div className={cn(
                                "w-full h-full transition-all duration-1000",
                                remoteUserIds.length === 1 ? "max-w-7xl aspect-video" : "grid gap-10 items-center justify-items-center",
                                remoteUserIds.length === 1 ? "" :
                                    remoteUserIds.length === 2 ? "grid-cols-2" :
                                        "grid-cols-2 lg:grid-cols-3"
                            )}>
                                {remoteUserIds.map(uid => (
                                    <div key={uid} className="w-full h-full min-h-[450px]">
                                        <RemoteVideo
                                            stream={remoteStreams[uid]}
                                            userId={uid}
                                            isTalking={speakingUsers.has(uid)}
                                            participant={callParticipants[uid]}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="absolute bottom-16 flex items-center gap-3 p-4 bg-gray-900/40 backdrop-blur-[50px] rounded-[3.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-20 transition-all duration-500 hover:scale-[1.02] hover:bg-gray-900/60">
                        <div className="flex items-center gap-2 px-4 border-r border-white/10">
                            <button
                                onClick={toggleAudio}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isMuted ? "bg-rose-500 text-white shadow-2xl shadow-rose-500/30" : "hover:bg-white/10 text-white"
                                )}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff size={30} /> : <Mic size={30} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isVideoOff ? "bg-rose-500 text-white shadow-2xl shadow-rose-500/30" : "text-primary hover:bg-white/10"
                                )}
                                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                            >
                                {isVideoOff ? <VideoOff size={30} /> : <Video size={30} />}
                            </button>
                            <button
                                onClick={toggleScreenShare}
                                className={cn(
                                    "p-5 rounded-[2.2rem] transition-all duration-300 active:scale-90",
                                    isScreenSharing ? "bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30" : "text-indigo-400 hover:bg-white/10"
                                )}
                                title="Share Screen"
                            >
                                <Monitor size={30} />
                            </button>
                        </div>

                        <div className="px-4 border-r border-white/10">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="p-5 rounded-[2.2rem] text-teal-400 hover:bg-white/10 transition-all duration-300 active:scale-90"
                                title="Add Participant"
                            >
                                <UserPlus size={30} />
                            </button>
                        </div>

                        <div className="px-4">
                            <button
                                onClick={endCall}
                                className="p-6 rounded-[2.5rem] bg-rose-500 hover:bg-rose-600 transition-all duration-300 active:scale-90 shadow-[0_20px_60px_rgba(244,63,94,0.5)]"
                                title="End Call"
                            >
                                <PhoneOff size={36} />
                            </button>
                        </div>
                    </div>

                    {/* Local Video Overlay */}
                    {localStream && (
                        <div className={cn(
                            "absolute transition-all duration-1000 shadow-2xl z-30 group overflow-hidden bg-gray-950",
                            isScreenSharing ? "top-12 right-12 w-96 aspect-video border-4 border-emerald-500 rounded-3xl" : "top-12 right-12 w-80 aspect-video border-2 border-white/10 rounded-[2.5rem]"
                        )}>
                            {isScreenSharing && (
                                <div className="absolute top-5 left-5 z-40 px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-2 shadow-xl shadow-emerald-500/20">
                                    <Monitor size={16} /> YOU ARE SHARING
                                </div>
                            )}
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={cn("w-full h-full object-cover mirror transition-all duration-1000 hover:scale-105", isVideoOff && "opacity-0")}
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
                                    <div className="mt-4 flex flex-col items-center">
                                        <span className="text-[10px] text-white/50 font-black tracking-widest uppercase">Your Camera is Off</span>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-5 left-5 px-3 py-1 bg-black/60 backdrop-blur-xl rounded-xl text-[10px] font-bold text-white/90 border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                You ({currentUser?.job_title || 'Host'})
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
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary opacity-50" size={28} />
                                        <input
                                            type="text"
                                            placeholder="SEARCH TEAM MEMBERS..."
                                            className="w-full bg-[#151518] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-black text-sm tracking-widest placeholder:text-gray-700"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[450px] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                                        {filteredContacts.map(contact => (
                                            <div key={contact.id} className="flex items-center justify-between p-6 hover:bg-white/5 rounded-[2.5rem] transition-all group border border-transparent hover:border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-18 h-18 rounded-[1.5rem] bg-gradient-to-tr from-primary/20 to-indigo-500/20 flex items-center justify-center text-primary font-black text-3xl border border-primary/20 shadow-inner overflow-hidden">
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
                                                    className="p-5 bg-primary text-white hover:bg-primary/80 rounded-[1.8rem] transition-all shadow-2xl shadow-primary/30 active:scale-95 border-b-4 border-primary-dark"
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

                    <style dangerouslySetInnerHTML={{
                        __html: `
                .mirror { transform: scaleX(-1); }
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 30px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); border: 2px solid transparent; background-clip: content-box; }
            ` }} />
                </div>
            )}
        </>
    );
};
