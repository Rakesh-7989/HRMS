import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare, Video, Phone, Linkedin, MoreHorizontal,
    Mail, CheckCircle2, Clock, Minus, PhoneIncoming, ChevronRight
} from 'lucide-react';
import { cn } from '@/utils/cn';

import { resolveImageUrl } from '@/utils/image';

interface UserHoverCardProps {
    user: {
        id: string;
        name: string;
        email?: string;
        image?: string | null;
        initials?: string;
        status?: string;
        status_message?: string;
        status_expiry?: string;
        job_title?: string;
    };
    position: { x: number; y: number };
    onClose: () => void;
    onMouseEnter?: () => void;
    onChat?: () => void;
    onVideo?: () => void;
    onCall?: () => void;
}

export const UserHoverCard: React.FC<UserHoverCardProps> = ({
    user, position, onClose, onMouseEnter, onChat, onVideo, onCall
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true); // Trigger animation

        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Calculate position to keep it on screen
    const style: React.CSSProperties = {
        top: position.y,
        left: position.x + 5, // Reduced offset
    };

    // Adjust if going off screen (basic logic)
    if (typeof window !== 'undefined') {
        if (position.y + 400 > window.innerHeight) {
            style.top = Math.max(10, window.innerHeight - 420);
        }
    }

    const getStatusConfig = (status?: string) => {
        const s = status?.toLowerCase() || 'offline';
        switch (s) {
            case 'available':
            case 'online':
                return { label: 'Available', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-600' };
            case 'busy':
                return { label: 'Busy', icon: PhoneIncoming, color: 'text-rose-600', bg: 'bg-rose-600' };
            case 'dnd':
                return { label: 'Do not disturb', icon: Minus, color: 'text-rose-600', bg: 'bg-rose-600' };
            case 'away':
                return { label: 'Away', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' };
            default:
                return { label: 'Offline', icon: CheckCircle2, color: 'text-gray-400', bg: 'bg-gray-400' };
        }
    };

    const statusConfig = getStatusConfig(user.status);
    const StatusIcon = statusConfig.icon;

    return createPortal(
        <div
            ref={cardRef}
            className={cn(
                "fixed z-[9999] w-[320px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden font-sans text-sm animate-in fade-in zoom-in-95 duration-200",
                isVisible ? "opacity-100" : "opacity-0"
            )}
            style={style}
            onMouseEnter={() => {
                setIsVisible(true);
                onMouseEnter?.();
            }}
            onMouseLeave={onClose}
        >
            {/* Header Content */}
            <div className="p-5 flex gap-4 items-start pb-2">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-600 text-xl font-semibold text-gray-500">
                        {user.image ? (
                            <img src={resolveImageUrl(user.image)} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user.initials || 'U'
                        )}
                    </div>
                    {/* Status Badge */}
                    <div className={cn(
                        "absolute bottom-0 right-0 w-5 h-5 rounded-full border-[3px] border-white dark:border-gray-800 flex items-center justify-center",
                        statusConfig.bg
                    )}>
                        {user.status === 'dnd' ? (
                            <Minus size={10} strokeWidth={4} className="text-white" />
                        ) : user.status === 'busy' ? (
                            <div className="w-2 h-2 bg-white rounded-full" />
                        ) : user.status === 'away' ? (
                            <Clock size={10} strokeWidth={3} className="text-white" />
                        ) : (
                            <CheckCircle2 size={10} className="text-white" />
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{user.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{user.job_title || 'Team Member'}</p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-1 px-4 py-2">
                <button onClick={onChat} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors" title="Chat">
                    <MessageSquare size={18} />
                </button>
                <button onClick={onVideo} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors" title="Video Call">
                    <Video size={18} />
                </button>
                <button onClick={onCall} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors" title="Audio Call">
                    <Phone size={18} />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors" title="LinkedIn">
                    <Linkedin size={18} />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors ml-auto" title="More">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {/* Status Box */}
            <div className="px-5 py-3 space-y-2">
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 flex items-center gap-3 bg-white dark:bg-gray-900 shadow-sm">
                    <div className={cn("flex-shrink-0", statusConfig.color)}>
                        <StatusIcon size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{statusConfig.label}</span>
                        {user.status_message && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                "{user.status_message}"
                                {user.status_expiry && new Date(user.status_expiry) > new Date() && (
                                    <span className="ml-1 text-[10px] text-gray-400">
                                        (Until {new Date(user.status_expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="px-5 pt-2 pb-5 space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:underline">
                        Contact <ChevronRight size={14} />
                    </div>

                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Mail size={16} />
                        <a href={`mailto:${user.email}`} className="text-primary hover:underline truncate text-xs">
                            {user.email || 'No email provided'}
                        </a>
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button className="text-primary text-xs font-medium hover:underline">Show more</button>
                </div>

                {/* LinkedIn / External Links Placeholder */}
                <div className="pt-2">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 cursor-pointer hover:underline">
                        LinkedIn <ChevronRight size={14} />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                            {user.image && <img src={user.image} className="w-full h-full object-cover opacity-50 grayscale" />}
                        </div>
                        <div className="text-xs text-gray-500">
                            No linked profile
                        </div>
                    </div>
                </div>
            </div>

        </div>,
        document.body
    );
};
