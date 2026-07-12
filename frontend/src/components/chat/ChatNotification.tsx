import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { useChat } from '@/contexts/ChatContext';
import { resolveImageUrl } from '@/utils/image';
import { ChatNotification as ChatNotificationType } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Image, FileText, Phone, X, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const getMessagePreview = (type: string, content: string) => {
    switch (type) {
        case 'IMAGE': return '📷 Photo';
        case 'FILE': return `📎 ${content || 'File'}`;
        case 'CALL': return '📞 Call';
        default: return content?.length > 45 ? content.substring(0, 45) + '…' : content;
    }
};

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'IMAGE': return <Image size={12} />;
        case 'FILE': return <FileText size={12} />;
        case 'CALL': return <Phone size={12} />;
        default: return <MessageSquare size={12} />;
    }
};

const getInitials = (name: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

interface GroupedNotification {
    conversationId: string;
    senderName: string;
    senderAvatar?: string;
    conversationName?: string;
    conversationType: 'DIRECT' | 'GROUP';
    latestMessage: ChatNotificationType;
    messages: ChatNotificationType[];
    count: number;
}

export const ChatNotification: React.FC = () => {
    const { chatNotifications, dismissChatNotification, userStatuses } = useChat();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    // Group notifications by conversation
    const grouped = useMemo<GroupedNotification[]>(() => {
        const map = new Map<string, GroupedNotification>();

        chatNotifications.forEach((n: ChatNotificationType) => {
            const key = n.conversationId;
            if (map.has(key)) {
                const group = map.get(key)!;
                group.messages.push(n);
                group.count++;
                if (new Date(n.createdAt) > new Date(group.latestMessage.createdAt)) {
                    group.latestMessage = n;
                }
            } else {
                map.set(key, {
                    conversationId: n.conversationId,
                    senderName: n.senderName,
                    senderAvatar: n.senderAvatar,
                    conversationName: n.conversationName,
                    conversationType: n.conversationType,
                    latestMessage: n,
                    messages: [n],
                    count: 1,
                });
            }
        });

        return Array.from(map.values());
    }, [chatNotifications]);

    if (grouped.length === 0) return null;

    const totalCount = chatNotifications.length;
    const latest = chatNotifications[0];

    const handleNavigate = (group: GroupedNotification) => {
        group.messages.forEach((m: ChatNotificationType) => dismissChatNotification(m.messageId));
        navigate(`/chat?conversation=${group.conversationId}`);
    };

    const handleDismissAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        chatNotifications.forEach((n: ChatNotificationType) => dismissChatNotification(n.messageId));
    };

    const displayName = (g: GroupedNotification) =>
        g.conversationType === 'GROUP' && g.conversationName
            ? g.conversationName
            : g.senderName;

    // Theme-based styles
    const cardBg = isDark
        ? 'bg-gray-900/90 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(99,102,241,0.1)]'
        : 'bg-white/95 border-brand-500/25 shadow-[0_12px_48px_rgba(66,39,90,0.18),0_4px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(66,39,90,0.08)]';

    const cardHover = isDark
        ? 'hover:border-brand-500/30'
        : 'hover:border-brand-500/50 hover:shadow-[0_16px_56px_rgba(66,39,90,0.22),0_6px_20px_rgba(0,0,0,0.12)]';

    const badgeBg = isDark
        ? 'bg-brand-500/10 border-brand-500/20'
        : 'bg-brand-500/10 border-brand-500/25';

    const badgeText = 'text-brand-500';

    const closeBtnClasses = isDark
        ? 'hover:bg-white/10 text-white/30 hover:text-white/70'
        : 'hover:bg-brand-500/10 text-gray-500 hover:text-gray-800';

    const rowHover = isDark
        ? 'hover:bg-white/5'
        : 'hover:bg-brand-500/5';

    const avatarBg = isDark
        ? 'from-brand-500/70 to-brand-600/70 border-white/10'
        : 'from-brand-500 to-brand-600 border-brand-500/20';

    const nameColor = isDark ? 'text-white' : 'text-gray-800';
    const previewColor = isDark ? 'text-white/40' : 'text-gray-600';
    const arrowColor = isDark ? 'text-white/15' : 'text-gray-400';
    const footerBorder = isDark ? 'border-white/5' : 'border-brand-500/10';
    const footerText = isDark ? 'text-white/20' : 'text-gray-500';
    const countBadgeBg = isDark ? 'bg-brand-500/15' : 'bg-brand-500/15';
    const progressTrack = isDark ? 'bg-white/5' : 'bg-brand-500/10';
    const onlineDot = isDark ? 'border-gray-900' : 'border-white';
    const typeIconColor = isDark ? 'text-brand-500/60' : 'text-brand-500';

    return (
        <>
            <div className="fixed bottom-6 right-6 z-[250] max-w-sm pointer-events-auto animate-in slide-in-from-bottom-10 duration-500" style={{ width: 'calc(100% - 3rem)' }}>
                <div className={`relative backdrop-blur-2xl rounded-2xl border overflow-hidden transition-all duration-300 ${cardBg} ${cardHover}`}>
                    {/* Gradient accent line at top */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-brand-500 to-violet-500" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${badgeBg}`}>
                                <MessageSquare size={12} className={badgeText} />
                                <span className={`text-[11px] font-bold ${badgeText}`}>
                                    {totalCount === 1 ? 'New Message' : `${totalCount} New Messages`}
                                </span>
                            </div>
                        </div>
                         <Button variant="ghost" 
                            onClick={handleDismissAll}
                            className={`p-1.5 rounded-lg transition-all duration-200 active:scale-90 ${closeBtnClasses}`}
                        >
                            <X size={14} />
                        </Button>
                    </div>

                    {/* Grouped conversation list */}
                    <div className="px-3 py-2.5 space-y-0.5 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        {grouped.map((g) => (
                            <div
                                key={g.conversationId}
                                className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${rowHover}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(g);
                                }}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-black shadow-elev-3 overflow-hidden border ${avatarBg}`}>
                                        {g.senderAvatar ? (
                                            <img src={resolveImageUrl(g.senderAvatar)} alt={g.senderName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{getInitials(g.senderName)}</span>
                                        )}
                                    </div>
                                    {(() => {
                                        const userStatus = userStatuses[g.latestMessage.senderId];
                                        if (!userStatus) return null;
                                        const status = userStatus.status;
                                        return (
                                            <div
                                                title={status.charAt(0).toUpperCase() + status.slice(1)}
                                                className={cn(
                                                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] cursor-help",
                                                    status === 'available' ? 'bg-emerald-500' :
                                                        status === 'away' ? 'bg-amber-500' :
                                                            status === 'dnd' || status === 'busy' ? 'bg-error-500' : 'bg-gray-400',
                                                    onlineDot
                                                )}
                                            >
                                                {status === 'available' && (
                                                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`font-semibold text-[12px] truncate leading-tight ${nameColor}`}>
                                            {displayName(g)}
                                        </span>
                                        {g.count > 1 && (
                                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-md text-brand-500 text-[10px] font-bold ${countBadgeBg}`}>
                                                {g.count}
                                            </span>
                                        )}
                                        <div className={typeIconColor}>
                                            {getTypeIcon(g.latestMessage.type)}
                                        </div>
                                    </div>
                                    <p className={`text-[11px] font-medium truncate ${previewColor}`}>
                                        {getMessagePreview(g.latestMessage.type, g.latestMessage.content)}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <ChevronRight size={14} className={`flex-shrink-0 ${arrowColor}`} />
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className={`px-4 pb-3 pt-0.5 border-t ${footerBorder}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest ${footerText}`}>
                            <MessageSquare size={10} />
                            <span>Tap to open</span>
                        </div>
                    </div>

                    {/* Auto-dismiss progress bar */}
                    <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${progressTrack}`}>
                        <div
                            className="h-full bg-gradient-to-r from-brand-500/60 to-brand-500/60 rounded-full"
                            key={latest.messageId}
                            style={{
                                animation: 'shrinkWidth 5s linear forwards'
                            }}
                        />
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes shrinkWidth {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `
            }} />
        </>
    );
};
