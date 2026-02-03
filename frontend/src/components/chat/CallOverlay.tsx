import React, { useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export const CallOverlay: React.FC = () => {
    const {
        incomingCall, activeCall, isCalling,
        localStream, remoteStream,
        acceptCall, rejectCall, endCall,
        isMuted, isVideoOff, toggleAudio, toggleVideo
    } = useChat();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    if (!incomingCall && !activeCall && !isCalling) return null;

    // --- Incoming Call View ---
    if (incomingCall) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center border border-gray-100 dark:border-gray-700">
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="relative flex items-center justify-center w-full h-full rounded-full bg-primary text-white text-3xl font-bold shadow-lg">
                            {incomingCall.callerName?.charAt(0) || '?'}
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{incomingCall.callerName || 'Unknown Caller'}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 flex items-center justify-center gap-2">
                        {incomingCall.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                        Incoming {incomingCall.type} call...
                    </p>
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={rejectCall}
                            className="p-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm"
                            title="Decline"
                        >
                            <PhoneOff size={28} />
                        </button>
                        <button
                            onClick={acceptCall}
                            className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg animate-bounce"
                            title="Accept"
                        >
                            <Phone size={28} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Outgoing / Active Call View ---
    const targetName = activeCall?.name || 'Unknown';

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center text-white overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Background Stream (Remote) */}
            <div className="absolute inset-0 flex items-center justify-center">
                {activeCall?.type === 'video' ? (
                    remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold border-2 border-primary animate-pulse">
                                {targetName.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xl font-medium animate-pulse">Calling {targetName}...</p>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-40 h-40 rounded-full bg-gray-800 flex items-center justify-center text-6xl font-bold border-4 border-primary shadow-2xl">
                            {targetName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold mb-2">{remoteStream ? 'Connected' : 'Calling...'}</h2>
                            <p className="text-gray-400">{(activeCall?.type as string) === 'video' ? 'Video' : 'Audio Only'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Local Preview (Small overlay) */}
            {activeCall?.type === 'video' && localStream && (
                <div className="absolute top-8 right-8 w-48 h-64 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-10">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cn("w-full h-full object-cover mirror transition-opacity duration-300", isVideoOff && "opacity-0")}
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <VideoOff size={32} className="text-gray-500" />
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-12 flex items-center gap-6 px-8 py-4 bg-gray-800/80 backdrop-blur-md rounded-full border border-white/10 shadow-2xl z-20">
                <button
                    onClick={toggleAudio}
                    className={cn(
                        "p-3 rounded-full transition-all hover:scale-110",
                        isMuted ? "bg-red-500 text-white" : "hover:bg-white/10"
                    )}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                {activeCall?.type === 'video' && (
                    <button
                        onClick={toggleVideo}
                        className={cn(
                            "p-3 rounded-full transition-all hover:scale-110",
                            isVideoOff ? "bg-red-500 text-white" : "text-primary hover:bg-white/10"
                        )}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                )}
                <button
                    onClick={endCall}
                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all hover:scale-110 shadow-xl"
                    title="End Call"
                >
                    <PhoneOff size={32} />
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .mirror { transform: scaleX(-1); }
            ` }} />
        </div>
    );
};
