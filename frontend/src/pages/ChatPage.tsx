import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { format } from 'date-fns';
import { Send, Phone, Video, Search, Paperclip, Edit2, Trash2, X, Check, Users, Plus, Smile, Clock, Minus, PhoneIncoming, Pin, ArrowRight, MicOff, VideoOff, Download, FileText, FileArchive, FileSpreadsheet, File, ExternalLink, CornerUpLeft, Share, MoreHorizontal, Copy, Image, UserPlus, User, Eraser, UserMinus, BellOff, MessageSquare, ZoomIn, ZoomOut, Maximize2, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveImageUrl } from '@/utils/image';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { UserHoverCard } from '@/components/chat/UserHoverCard';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    designation?: string;
    profile_pic?: string;
    status?: 'ONLINE' | 'AWAY' | 'DND' | 'BUSY' | 'OFFLINE';
    phone_number?: string;
    employee_id?: string;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'TEXT' | 'FILE' | 'IMAGE' | 'CALL';
    file_url?: string;
    conversation_id: string;
    is_read?: boolean;
    sender_first_name?: string;
    sender_last_name?: string;
    sender_profile_pic?: string;
    reactions?: { id: string; user_id: string; emoji: string }[];
    parent_id?: string;
    parent_message?: { content: string; sender_first_name?: string };
    is_edited?: boolean;
    is_pinned?: boolean;
}

interface Conversation {
    id: string;
    type: 'DIRECT' | 'GROUP';
    name?: string;
    participants: User[];
    last_message?: {
        content: string;
        created_at: string;
        type: 'TEXT' | 'FILE' | 'IMAGE' | 'CALL';
    };
    unread_count: number;
    updated_at: string;
}

const ForwardModal = ({ isOpen, onClose, conversations, onForward, message }: { isOpen: boolean; onClose: () => void; conversations: Conversation[]; onForward: (conversationId: string) => void; message: Message | null }) => {
    const [search, setSearch] = useState('');
    const { t } = useTranslation();
    if (!isOpen || !message) return null;

    const filtered = conversations.filter(c => (c.name || t('chat.groupChat')).toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5 border dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">{t('chat.forwardMessage')}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('chat.searchConversations')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filtered.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => { onForward(conv.id); onClose(); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary-10 dark:hover:bg-primary-20 rounded-xl transition-colors text-left"
                        >
                            <div className="h-10 w-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {(conv.name || 'G').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{conv.name || t('chat.groupChat')}</p>
                            </div>
                            <ArrowRight size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Icons imported above ---

const CreateGroupModal = ({ isOpen, onClose, contacts, onCreate, isLoading, initialSelectedUserIds = [] }: { isOpen: boolean; onClose: () => void; contacts: User[]; onCreate: (name: string, userIds: string[]) => void; isLoading: boolean; initialSelectedUserIds?: string[] }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedUsers(initialSelectedUserIds);
            setGroupName('');
            setContactSearch('');
        }
    }, [isOpen, initialSelectedUserIds]);

    if (!isOpen) return null;

    const filteredContacts = contacts.filter(c =>
        `${c.first_name} ${c.last_name} ${c.email} ${c.phone_number || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName || selectedUsers.length === 0) return;
        onCreate(groupName, selectedUsers);
        onClose();
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200/50 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Start a group chat</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Add people to start a new collaboration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 border-b-2 border-gray-200 dark:border-gray-700 rounded-t-xl focus:border-primary transition-all text-sm outline-none"
                            placeholder="Enter name of the group"
                            required
                        />
                    </div>
                    <div className="mb-5">
                        <div className="relative mb-3">
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm outline-none"
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                placeholder="Enter name, email or phone number"
                            />
                        </div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Add Participants</label>
                        <div className="max-h-52 min-h-[120px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1.5 bg-gray-50/50 dark:bg-gray-800/30">
                            {isLoading ? (
                                <p className="text-sm text-gray-500 text-center py-8">Loading contacts...</p>
                            ) : filteredContacts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No contacts found</p>
                            ) : (
                                filteredContacts.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleUser(user.id)}
                                        className={cn(
                                            "p-3 flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200",
                                            selectedUsers.includes(user.id)
                                                ? "bg-primary-gradient text-white shadow-md shadow-primary/20"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                                            selectedUsers.includes(user.id)
                                                ? 'border-white/40 bg-white/20'
                                                : 'border-gray-300 dark:border-gray-600'
                                        )}>
                                            {selectedUsers.includes(user.id) && <Check size={12} className="text-white" />}
                                        </div>
                                        <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        {selectedUsers.length > 0 && (
                            <p className="text-xs text-primary mt-2 font-medium">{selectedUsers.length} member(s) selected</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">Cancel</button>
                        <button
                            type="submit"
                            disabled={!groupName || selectedUsers.length === 0}
                            className="px-5 py-2.5 text-sm font-medium bg-primary-gradient text-white rounded-xl hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteMessageModal = ({ isOpen, onClose, onDelete, isMe }: { isOpen: boolean; onClose: () => void; onDelete: (mode: 'me' | 'everyone') => void; isMe: boolean }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-[320px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Delete message?</h3>

                <div className="flex flex-col gap-2">
                    {isMe && (
                        <button
                            onClick={() => { onDelete('everyone'); onClose(); }}
                            className="w-full py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all active:scale-95"
                        >
                            Delete for everyone
                        </button>
                    )}

                    <button
                        onClick={() => { onDelete('me'); onClose(); }}
                        className="w-full py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all active:scale-95"
                    >
                        Delete for me
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all active:scale-95 mt-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

const AddParticipantModal = ({ isOpen, onClose, contacts, onAdd, alreadyParticipantIds }: { isOpen: boolean; onClose: () => void; contacts: User[]; onAdd: (userIds: string[]) => void; alreadyParticipantIds: string[] }) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    if (!isOpen) return null;

    const filtered = contacts.filter(c =>
        !alreadyParticipantIds.includes(c.id) &&
        ((c.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleUser = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 border dark:border-gray-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white">Add People</h3>
                        <p className="text-xs text-gray-500 mt-1">Select contacts to add to this group</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"><X size={20} /></button>
                </div>

                <div className="relative mb-4 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 dark:text-gray-100 placeholder:text-gray-400 transition-all font-medium"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar mb-6 min-h-[200px]">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                            <Users size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">No contacts found</p>
                        </div>
                    ) : filtered.map(contact => {
                        const isSelected = selectedIds.includes(contact.id);
                        return (
                            <button
                                key={contact.id}
                                onClick={() => toggleUser(contact.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group border ${isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'}`}
                            >
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {contact.profile_pic ? (
                                            <img src={resolveImageUrl(contact.profile_pic)} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-gray-500 dark:text-gray-400">{(contact.first_name?.[0] || contact.email[0]).toUpperCase()}</span>
                                        )}
                                    </div>
                                    {isSelected && <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 ring-2 ring-white dark:ring-gray-900 animate-in zoom-in duration-200"><Check size={10} strokeWidth={4} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {contact.first_name} {contact.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                    <button
                        onClick={() => { onAdd(selectedIds); onClose(); }}
                        disabled={selectedIds.length === 0}
                        className="px-6 py-2.5 bg-primary-gradient text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPage = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const {
        socket, joinRoom, markAsRead, initiateCall,
        typingStatus, sendTypingStatus,
        activeCall, isMuted, isVideoOff, toggleAudio, toggleVideo,
        activeRoomCall, joinActiveCall, setActiveConversation,
        myStatus, updateMyStatus, userStatuses
    } = useChat();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isSelectingContact, setIsSelectingContact] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null); // New: Reply state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Added typingTimeoutRef
    const queryClient = useQueryClient();
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversationFilter, setConversationFilter] = useState<'all' | 'unread' | 'groups'>('all');
    const [contactSearchQuery, setContactSearchQuery] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // Message ID for reaction picker
    const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null); // Message ID for more options menu
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [showPins, setShowPins] = useState(false);
    const [isViewingGroupProfile, setIsViewingGroupProfile] = useState(false);
    const [chatViewTab, setChatViewTab] = useState<'chat' | 'files' | 'photos'>('chat');
    const [showHeaderMoreMenu, setShowHeaderMoreMenu] = useState(false);
    const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
    const [isAddingParticipant, setIsAddingParticipant] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Hover Card State
    const [hoveredUser, setHoveredUser] = useState<{
        id: string;
        name: string;
        image?: string | null;
        initials?: string;
        status?: string;
        status_message?: string;
        status_expiry?: string;
        email?: string;
        job_title?: string;
    } | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number, y: number } | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset view tab and close search when switching conversations
    useEffect(() => {
        setChatViewTab('chat');
        setShowMessageSearch(false);
    }, [selectedConversationId]);

    // Deep-link: auto-select conversation from URL param (e.g. from notification click)
    useEffect(() => {
        const convId = searchParams.get('conversation');
        if (convId && convId !== selectedConversationId) {
            setSelectedConversationId(convId);
            // Clean the URL param after consuming it
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, selectedConversationId, setSearchParams]);

    // Sync active conversation to ChatContext so notifications are suppressed for the open chat
    useEffect(() => {
        setActiveConversation(selectedConversationId);
        return () => setActiveConversation(null);
    }, [selectedConversationId, setActiveConversation]);



    // Fetch Conversations list (filtered by backend)
    const { data: conversations, isLoading: isLoadingConversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await api.get('/chat/conversations');
            return res.data.data as Conversation[];
        }
    });

    // Fetch Active Conversation details (always fetch even if empty)
    const { data: activeConversation } = useQuery({
        queryKey: ['conversation', selectedConversationId],
        queryFn: async () => {
            if (!selectedConversationId) return null;
            const res = await api.get(`/chat/conversations/${selectedConversationId}`);
            return res.data.data as Conversation;
        },
        enabled: !!selectedConversationId
    });

    // Fetch Contacts
    const { data: contacts, isLoading: isLoadingContacts } = useQuery({
        queryKey: ['contacts'],
        queryFn: async () => {
            const res = await api.get('/chat/contacts');
            return res.data.data as (User & { designation?: string })[];
        },
        enabled: isSelectingContact || isGroupModalOpen
    });

    // Fetch Messages for selected conversation
    const { data: messages } = useQuery({
        queryKey: ['messages', selectedConversationId],
        queryFn: async () => {
            if (!selectedConversationId) return [];
            const res = await api.get(`/chat/conversations/${selectedConversationId}/messages`);
            return res.data.data as Message[];
        },
        enabled: !!selectedConversationId
    });

    const otherParticipantId = activeConversation?.type === 'DIRECT'
        ? activeConversation.participants?.find((p: any) => p.id !== user?.id)?.id
        : null;

    const handleStartDirectChat = async (contactUserId: string) => {
        try {
            const res = await api.post('/chat/conversations/direct', { userId: contactUserId });
            const conversation = res.data.data;
            const conversationId = conversation.id;

            // Seed the individual conversation cache so header shows name instantly
            queryClient.setQueryData(['conversation', conversationId], conversation);

            // Refresh list and switch
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setSelectedConversationId(conversationId);
            setIsSelectingContact(false);
        } catch (err) {
            console.error("Failed to start chat", err);
        }
    };

    // Use a ref to prevent infinite loops on conversation selection
    const lastJoinedRoomRef = useRef<string | null>(null);

    // Join room and mark as read when conversation selected
    useEffect(() => {
        if (selectedConversationId && selectedConversationId !== lastJoinedRoomRef.current) {
            joinRoom(selectedConversationId);

            // Only mark as read if there are unread messages in the local state
            const currentConv = conversations?.find(c => c.id === selectedConversationId);
            if (currentConv && currentConv.unread_count > 0) {
                markAsRead(selectedConversationId);
            }

            lastJoinedRoomRef.current = selectedConversationId;
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    }, [selectedConversationId, joinRoom, markAsRead, queryClient, conversations]);

    // Listen for real-time messages
    useEffect(() => {
        if (socket) {
            const handleReceiveMessage = (newMessage: Message) => {
                // If message belongs to current conversation, update messages
                if (newMessage.conversation_id === selectedConversationId) {
                    queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                        if (old.find(m => m.id === newMessage.id)) return old;
                        return [...old, newMessage];
                    });
                    // Mark as read immediately if chat is open
                    markAsRead(selectedConversationId);
                }
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            };

            socket.on('receive_message', handleReceiveMessage);
            socket.on('unread_update', () => queryClient.invalidateQueries({ queryKey: ['conversations'] }));

            // ... (rest of listeners)
            // Listen for message read status updates (bulk)
            socket.on('messages_read', ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
                if (conversationId === selectedConversationId) {
                    queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                        return old.map(msg => {
                            // Mark as read if it is not my own read receipt (or just mark everything read in this conv that isn't me... wait)
                            // Logic: If someone else read the messages, then any message *I* sent or *others* sent is now read by *them*.
                            // But the UI usually shows checkmarks for *my* messages being read by *them*.
                            // So if readerId !== user.id, we mark messages as read.
                            if (readerId !== user?.id) {
                                return { ...msg, is_read: true };
                            }
                            return msg;
                        });
                    });
                }
            });

            // Listen for user status updates (global/tenant level)
            socket.on('user_status_change', ({ userId, status }: { userId: string; status: User['status'] }) => {
                // Update status in conversations list
                queryClient.setQueryData(['conversations'], (old: Conversation[] = []) => {
                    return old.map(conv => ({
                        ...conv,
                        participants: conv.participants.map(p =>
                            p.id === userId ? { ...p, status } : p
                        )
                    }));
                });

                // Also update the active conversation cache if this user is a participant
                if (selectedConversationId) {
                    queryClient.setQueryData(['conversation', selectedConversationId], (old: Conversation | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            participants: old.participants.map(p =>
                                p.id === userId ? { ...p, status } : p
                            )
                        };
                    });
                }
            });

            socket.on('message_updated', (updatedMessage: Message) => {
                if (updatedMessage.conversation_id === selectedConversationId) {
                    queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                        return old.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m);
                    });
                }
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            });

            socket.on('message_deleted', ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
                if (conversationId === selectedConversationId) {
                    queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                        return old.filter(m => m.id !== messageId);
                    });
                }
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            });

            return () => {
                socket.off('receive_message');
                socket.off('unread_update');
                socket.off('messages_read');
                socket.off('reaction_added');
                socket.off('reaction_removed');
                socket.off('user_status_change');
                socket.off('message_updated');
                socket.off('message_deleted');
            };
        }
    }, [socket, selectedConversationId, queryClient, markAsRead]);

    // Listen for reactions
    useEffect(() => {
        if (!socket) return;

        socket.on('reaction_added', (data: { messageId: string, userId: string, emoji: string }) => {
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                return old.map(m => {
                    if (m.id === data.messageId) {
                        const exists = m.reactions?.some(r => String(r.user_id) === String(data.userId) && r.emoji === data.emoji);
                        if (exists) return m;
                        // Add reaction locally
                        return { ...m, reactions: [...(m.reactions || []), { id: `socket-${Date.now()}`, user_id: data.userId, emoji: data.emoji }] };
                    }
                    return m;
                });
            });
        });

        socket.on('reaction_removed', (data: { messageId: string, userId: string, emoji: string }) => {
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                return old.map(m => {
                    if (m.id === data.messageId) {
                        return { ...m, reactions: m.reactions?.filter(r => !(String(r.user_id) === String(data.userId) && r.emoji === data.emoji)) };
                    }
                    return m;
                });
            });
        });

        return () => {
            // Cleanup if needed, though simpler inside the main useEffect return or separate
            socket.off('reaction_added');
            socket.off('reaction_removed');
        };
    }, [socket, selectedConversationId, queryClient]);

    useEffect(() => {
        if (!socket) return;
        socket.on('message_pinned', (updated: Message) => {
            if (updated.conversation_id === selectedConversationId) {
                queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                    old.map(m => m.id === updated.id ? { ...m, is_pinned: updated.is_pinned } : m)
                );
            }
        });
        return () => { socket.off('message_pinned'); };
    }, [socket, selectedConversationId, queryClient]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Image Lightbox State
    const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string; sender?: string; time?: string } | null>(null);
    const [lightboxZoom, setLightboxZoom] = useState(1);
    const [lightboxRotation, setLightboxRotation] = useState(0);

    // File Preview State (for PDFs and other viewable files)
    const [filePreview, setFilePreview] = useState<{ url: string; name: string; sender?: string; time?: string; ext?: string } | null>(null);

    const openLightbox = (url: string, name: string, sender?: string, time?: string) => {
        setLightboxImage({ url, name, sender, time });
        setLightboxZoom(1);
        setLightboxRotation(0);
    };

    const closeLightbox = () => {
        setLightboxImage(null);
        setLightboxZoom(1);
        setLightboxRotation(0);
    };


    const closeFilePreview = () => {
        setFilePreview(null);
    };

    // Keyboard listener for lightbox & file preview
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (lightboxImage) closeLightbox();
                if (filePreview) closeFilePreview();
            }
            if (lightboxImage) {
                if (e.key === '+' || e.key === '=') setLightboxZoom(z => Math.min(z + 0.25, 5));
                if (e.key === '-') setLightboxZoom(z => Math.max(z - 0.25, 0.25));
                if (e.key === 'r') setLightboxRotation(r => r + 90);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxImage, filePreview]);




    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConversationId) return;

        // Reset the input value so the same file can be selected again
        if (e.target) e.target.value = '';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success' && res.data.data?.fileUrl) {
                const fileUrl = res.data.data.fileUrl;
                const isImage = file.type.startsWith('image/');
                await api.post(`/chat/conversations/${selectedConversationId}/messages`, {
                    content: file.name,
                    type: isImage ? 'IMAGE' : 'FILE',
                    fileUrl: fileUrl
                });
                import('react-hot-toast').then(({ toast }) => toast.success('File uploaded successfully'));
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Upload failed", err);
            import('react-hot-toast').then(({ toast }) => toast.error(err.response?.data?.message || 'File upload failed'));
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConversationId) return;

        // Stop typing indicator immediately
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            sendTypingStatus(selectedConversationId, false);
        }

        try {
            await api.post(`/chat/conversations/${selectedConversationId}/messages`, {
                content: messageInput,
                type: 'TEXT',
                parentId: replyToMessage?.id // Send parentId
            });
            setMessageInput('');
            setReplyToMessage(null); // Clear reply
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        if (!selectedConversationId) return;

        // Typing logic
        if (!messageInput) { // Only send typing_start if input was empty
            sendTypingStatus(selectedConversationId, true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingStatus(selectedConversationId, false);
        }, 3000);
    };

    const handleDeleteMessage = async (messageId: string, mode: 'me' | 'everyone' = 'everyone') => {
        if (!selectedConversationId) return;
        try {
            await api.delete(`/chat/conversations/${selectedConversationId}/messages/${messageId}?mode=${mode}`);
            // Optimistic update
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => old.filter(m => m.id !== messageId));
            import('react-hot-toast').then(({ toast }) => toast.success('Message deleted'));
        } catch (err) {
            console.error("Failed to delete", err);
            import('react-hot-toast').then(({ toast }) => toast.error('Failed to delete message'));
        }
    };

    const startEditing = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const saveEdit = async (messageId: string) => {
        if (!selectedConversationId || !editContent.trim()) return;

        // Find the current message to check if content actually changed
        const currentMsgs = queryClient.getQueryData<Message[]>(['messages', selectedConversationId]) || [];
        const originalMsg = currentMsgs.find(m => m.id === messageId);

        if (originalMsg && originalMsg.content === editContent.trim()) {
            cancelEditing();
            return;
        }

        try {
            await api.put(`/chat/conversations/${selectedConversationId}/messages/${messageId}`, {
                content: editContent
            });
            // Optimistic update
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                old.map(m => m.id === messageId ? { ...m, content: editContent, is_edited: true } : m)
            );
            setEditingMessageId(null);
            setEditContent('');
            import('react-hot-toast').then(({ toast }) => toast.success('Message updated'));
        } catch (err: any) {
            console.error("Failed to update", err);
            import('react-hot-toast').then(({ toast }) => toast.error(err.message || 'Failed to update message'));
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Manual download fail, falling back to window.open:", err);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleTogglePin = async (messageId: string) => {
        if (!selectedConversationId) return;
        try {
            const res = await api.post(`/chat/conversations/${selectedConversationId}/messages/${messageId}/toggle-pin`);
            const updated = res.data.data;
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                old.map(m => m.id === messageId ? { ...m, is_pinned: updated.is_pinned } : m)
            );
        } catch (err) {
            console.error("Failed to toggle pin", err);
        }
    };

    const handleForward = async (message: Message, targetConversationId: string) => {
        try {
            await api.post(`/chat/conversations/${targetConversationId}/messages`, {
                content: `Forwarded: ${message.content}`,
                type: message.type,
                fileUrl: message.file_url
            });
            import('react-hot-toast').then(({ toast }) => toast.success('Message forwarded'));
        } catch (err) {
            console.error("Failed to forward", err);
        }
    };

    const handleToggleReaction = async (messageId: string, emoji: string, currentReactions: any[] = []) => {
        if (!selectedConversationId || !user) return;
        const existing = currentReactions?.find(r => String(r.user_id) === String(user.id) && r.emoji === emoji);

        try {
            if (existing) {
                // Optimistic: Remove
                queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                    old.map(m => m.id === messageId ? { ...m, reactions: m.reactions?.filter(r => !(String(r.user_id) === String(user.id) && r.emoji === emoji)) } : m)
                );
                await api.delete(`/chat/conversations/${selectedConversationId}/messages/${messageId}/reactions`, { data: { emoji } });
            } else {
                // Optimistic: Add
                queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                    old.map(m => {
                        if (m.id === messageId) {
                            const alreadyAdded = m.reactions?.some(r => String(r.user_id) === String(user.id) && r.emoji === emoji);
                            if (alreadyAdded) return m;
                            return { ...m, reactions: [...(m.reactions || []), { id: `opt-${Date.now()}`, user_id: user.id, emoji }] };
                        }
                        return m;
                    })
                );
                await api.post(`/chat/conversations/${selectedConversationId}/messages/${messageId}/reactions`, { emoji });
            }
        } catch (err) {
            console.error("Failed to toggle reaction", err);
        }
    };

    const handleClearChat = async () => {
        if (!selectedConversationId) return;
        if (!window.confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) return;
        try {
            await api.delete(`/chat/conversations/${selectedConversationId}/clear`);
            queryClient.setQueryData(['messages', selectedConversationId], []);
            setShowHeaderMoreMenu(false);
            import('react-hot-toast').then(({ toast }) => toast.success('Chat history cleared'));
        } catch (err) {
            console.error("Failed to clear chat", err);
            import('react-hot-toast').then(({ toast }) => toast.error('Failed to clear chat'));
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedConversationId) return;
        if (!window.confirm("Are you sure you want to delete this entire conversation? This action is permanent and will remove the chat for all participants.")) return;
        try {
            await api.delete(`/chat/conversations/${selectedConversationId}`);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setSelectedConversationId(null);
            setShowHeaderMoreMenu(false);
            import('react-hot-toast').then(({ toast }) => toast.success('Conversation permanently deleted'));
        } catch (err) {
            console.error("Failed to delete conversation", err);
            import('react-hot-toast').then(({ toast }) => toast.error('Failed to delete conversation'));
        }
    };


    const handleAddParticipants = async (userIds: string[]) => {
        if (!activeConversation) return;
        try {
            await api.post(`/chat/conversations/${activeConversation.id}/participants`, { userIds });
            queryClient.invalidateQueries({ queryKey: ['conversation', activeConversation.id] });
            setIsAddingParticipant(false);
            import('react-hot-toast').then(({ toast }) => toast.success('Participants added'));
        } catch (err) {
            console.error("Failed to add participants", err);
            import('react-hot-toast').then(({ toast }) => toast.error('Failed to add participants'));
        }
    };

    const handleRemoveParticipant = async (userId: string) => {
        if (!activeConversation) return;
        if (!window.confirm("Remove this person from the group?")) return;
        try {
            await api.delete(`/chat/conversations/${activeConversation.id}/participants/${userId}`);
            queryClient.invalidateQueries({ queryKey: ['conversation', activeConversation.id] });
            import('react-hot-toast').then(({ toast }) => toast.success('Participant removed'));
        } catch (err) {
            console.error("Failed to remove participant", err);
            import('react-hot-toast').then(({ toast }) => toast.error('Failed to remove participant'));
        }
    };

    // -- Helper to get conversation name/image --
    const getConversationDetails = (conv: Conversation) => {
        if (!conv || !conv.type) {
            return { name: 'Unknown', image: null, initials: 'U', participantId: null };
        }

        if (conv.type === 'DIRECT') {
            const other = conv.participants?.find(p => String(p.id) !== String(user?.id)) || conv.participants?.[0];
            const name = `${other?.first_name || ''} ${other?.last_name || ''}`.trim() || other?.email || 'Unknown';

            // Get dynamic status if available
            // Get dynamic status if available - checking both user_id (preferred) and id, with type leniency
            const targetId = (other as any)?.user_id || other?.id;
            const dynamicStatus = targetId ? (userStatuses[targetId] || userStatuses[String(targetId)] || userStatuses[Number(targetId)]) : undefined;

            const status = (dynamicStatus && 'status' in dynamicStatus) ? dynamicStatus.status : other?.status?.toLowerCase();
            const status_message = (dynamicStatus && 'message' in dynamicStatus) ? dynamicStatus.message : (other as any)?.status_message;
            const status_expiry = (dynamicStatus && 'expiry' in dynamicStatus) ? dynamicStatus.expiry : (other as any)?.status_expiry;

            return {
                name,
                image: other?.profile_pic ? resolveImageUrl(other.profile_pic) : null,
                initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                participantId: other?.id,
                status,
                status_message,
                status_expiry,
                email: other?.email,
                job_title: (other as any)?.job_title || other?.designation
            };
        }
        return {
            name: conv.name || 'Group Chat',
            image: null,
            initials: (conv.name || 'G').slice(0, 2).toUpperCase(),
            participantId: null,
            status: undefined,
            status_message: undefined,
            status_expiry: undefined,
            email: undefined,
            job_title: undefined
        };
    };

    return (
        <DashboardLayout>
            <div className="-m-4 md:-m-6 flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 overflow-hidden">

                {/* Sidebar */}
                <div className="w-[340px] border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Status Selector - Teams Style */}
                            <div className="relative group/status">
                                <div className="relative h-9 w-9 cursor-pointer">
                                    {/* Avatar Base */}
                                    <div className="h-9 w-9 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                        <span className="text-xs font-bold text-primary">{user?.first_name?.[0] || 'U'}</span>
                                    </div>

                                    {/* Status Dot Overlay - Teams Style */}
                                    <div className={cn(
                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center cursor-help",
                                        myStatus === 'available' ? 'bg-emerald-500' :
                                            myStatus === 'away' ? 'bg-amber-500' :
                                                myStatus === 'dnd' ? 'bg-rose-500' :
                                                    myStatus === 'busy' ? 'bg-rose-500' : 'bg-gray-400'
                                    )} title={myStatus === 'busy' ? 'In a Meeting' : (myStatus === 'dnd' ? 'Do not disturb' : (myStatus ? myStatus.charAt(0).toUpperCase() + myStatus.slice(1) : 'Available'))}>
                                        {myStatus === 'available' && <Check size={8} strokeWidth={4} className="text-white" />}
                                        {myStatus === 'away' && <Clock size={8} strokeWidth={3} className="text-white" />}
                                        {myStatus === 'dnd' && <Minus size={8} strokeWidth={4} className="text-white" />}
                                        {myStatus === 'offline' && <div className="h-1.5 w-1.5 rounded-full border border-white dark:border-gray-900" />}
                                    </div>
                                </div>
                                <div className="absolute top-8 left-0 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 hidden group-hover/status:block z-50">
                                    {(['available', 'away', 'dnd', 'busy', 'offline'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => updateMyStatus(s)}
                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                                        >
                                            <span className={cn(
                                                "h-2 w-2 rounded-full",
                                                s === 'available' ? 'bg-emerald-500' :
                                                    s === 'away' ? 'bg-amber-500' :
                                                        s === 'dnd' || s === 'busy' ? 'bg-rose-500' : 'bg-gray-400'
                                            )} />
                                            {s === 'busy' ? 'In a Meeting' : s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-black bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">Messages</h2>
                                <p className="text-[10px] text-gray-400 font-medium">Stay connected with your team</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="p-2.5 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl text-gray-500 hover:text-primary transition-all duration-200 hover:scale-105"
                                title="New Group"
                            >
                                <Users className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setIsSelectingContact(!isSelectingContact)}
                                className="p-2.5 bg-primary-gradient hover:opacity-90 rounded-xl text-white transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                                title="New Chat"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 pb-3 pt-2 space-y-3 bg-white dark:bg-gray-900 z-10 transition-all duration-300 min-h-[80px]">
                        {!isSelectingContact ? (
                            <>
                                {/* Conversation Search Bar */}
                                <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search messages..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2.5 bg-gray-100/50 dark:bg-gray-800/50 border-transparent focus:bg-white dark:focus:bg-gray-900 border focus:border-primary/30 rounded-xl text-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    />
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 delay-75">
                                    {(['all', 'unread', 'groups'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setConversationFilter(filter)}
                                            className={cn(
                                                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 capitalize",
                                                conversationFilter === filter
                                                    ? "bg-white dark:bg-gray-900 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                                            )}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Contact Search & Header */
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3">
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        onClick={() => { setIsSelectingContact(false); setContactSearchQuery(''); }}
                                        className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-primary transition-colors"
                                    >
                                        <ArrowRight className="h-5 w-5 rotate-180" />
                                    </button>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{t('chat.newChat')}</h3>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('chat.searchContacts')}
                                        value={contactSearchQuery}
                                        onChange={(e) => setContactSearchQuery(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2.5 bg-gray-100/50 dark:bg-gray-800/50 border-transparent focus:bg-white dark:focus:bg-gray-900 border focus:border-primary/30 rounded-xl text-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isSelectingContact ? (
                            <div className="animate-in slide-in-from-right duration-300">
                                <div className="p-2">
                                    <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('chat.suggestedContacts')}</p>
                                    {isLoadingContacts ? (
                                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-xs text-gray-400">{t('chat.loadingContacts')}</p>
                                        </div>
                                    ) : contacts?.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-sm text-gray-500">{t('chat.noContactsFound')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {contacts?.filter(contact => {
                                                if (!contactSearchQuery.trim()) return true;
                                                const q = contactSearchQuery.toLowerCase();
                                                const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
                                                return fullName.includes(q) || contact.email?.toLowerCase().includes(q) || contact.employee_id?.toLowerCase().includes(q);
                                            }).map(contact => (
                                                <button
                                                    key={contact.id}
                                                    onClick={() => handleStartDirectChat(contact.id)}
                                                    className="w-full p-2.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-all duration-200 text-left group hover:scale-[1.01] hover:shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                                                >
                                                    <div className="relative">
                                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-primary font-bold shadow-sm group-hover:from-primary group-hover:to-primary-light group-hover:text-white transition-all duration-300">
                                                            {contact.profile_pic ? (
                                                                <img src={resolveImageUrl(contact.profile_pic)} className="w-full h-full object-cover rounded-xl" />
                                                            ) : (
                                                                (contact.first_name?.charAt(0) || contact.email.charAt(0))
                                                            )}
                                                        </div>
                                                        <div className={cn(
                                                            "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center bg-gray-400",
                                                            contact.status === 'ONLINE' && "bg-emerald-500",
                                                            contact.status === 'AWAY' && "bg-amber-500",
                                                            contact.status === 'DND' && "bg-rose-500"
                                                        )} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                                                            {contact.first_name ? `${contact.first_name} ${contact.last_name || ''}` : contact.email}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                            {contact.designation || contact.email}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoadingConversations ? (
                                    <div className="p-4 text-center text-gray-500">{t('chat.loadingChats')}</div>
                                ) : conversations?.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in duration-500">
                                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                            <MessageSquare size={32} className="text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-gray-900 dark:text-white font-semibold mb-1">{t('chat.noChatsYet')}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 px-6">
                                            {t('chat.connectWithTeam')}
                                        </p>
                                        <button
                                            onClick={() => setIsSelectingContact(true)}
                                            className="px-5 py-2.5 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            {t('chat.startNewChat')}
                                        </button>
                                    </div>
                                ) : (() => {
                                    const filteredConversations = conversations?.filter(conv => {
                                        // Tab Filter
                                        if (conversationFilter === 'unread' && conv.unread_count === 0) return false;
                                        if (conversationFilter === 'groups' && conv.type !== 'GROUP') return false;

                                        if (!searchQuery.trim()) return true;
                                        const q = searchQuery.toLowerCase();
                                        const details = getConversationDetails(conv);
                                        const nameMatch = details.name?.toLowerCase().includes(q);
                                        const participantMatch = conv.participants?.some(p =>
                                            `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(q) ||
                                            p.email?.toLowerCase().includes(q) ||
                                            p.employee_id?.toLowerCase().includes(q)
                                        );
                                        const messageMatch = conv.last_message?.content?.toLowerCase().includes(q);
                                        return nameMatch || participantMatch || messageMatch;
                                    }) || [];

                                    if (filteredConversations.length === 0 && searchQuery.trim()) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-12 px-6 animate-in fade-in duration-300">
                                                <div className="relative mb-4">
                                                    <div className="w-16 h-16 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center">
                                                        <Search className="h-7 w-7 text-primary/40" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-white dark:border-gray-900">
                                                        <X size={10} className="text-gray-400" />
                                                    </div>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">{t('chat.noResultsFound')}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-4 max-w-[200px]">
                                                    {t('chat.noConversationsMatching')} "<span className="font-medium text-primary">{searchQuery}</span>"
                                                </p>
                                                <button
                                                    onClick={() => { setIsSelectingContact(true); setSearchQuery(''); }}
                                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-gradient rounded-xl hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                                                >
                                                    <Plus size={14} />
                                                    {t('chat.startNewChat')}
                                                </button>
                                            </div>
                                        );
                                    }

                                    return filteredConversations.map(conv => {
                                        const details = getConversationDetails(conv);
                                        const isActive = selectedConversationId === conv.id;
                                        return (
                                            <button
                                                key={conv.id}
                                                onClick={() => setSelectedConversationId(conv.id)}
                                                className={cn(
                                                    "w-full p-3.5 mx-2 my-1 flex items-center gap-4 rounded-2xl transition-all duration-300 text-left relative group border border-transparent",
                                                    isActive
                                                        ? "bg-primary/5 dark:bg-primary/10 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border-primary/10 dark:border-primary/20"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:scale-[1.01]"
                                                )}
                                            >
                                                {isActive && <div className="absolute left-0.5 top-3 bottom-3 w-1 bg-primary-gradient rounded-r-full" />}

                                                <div className="relative flex-shrink-0">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105",
                                                        isActive ? "bg-primary-gradient text-white" : "bg-gray-100 dark:bg-gray-800 text-primary dark:text-primary-light"
                                                    )}>
                                                        {details.image ? (
                                                            <img src={details.image} className="w-full h-full object-cover rounded-2xl" />
                                                        ) : details.initials}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center cursor-help",
                                                        details.status === 'available' || details.status === 'online' ? 'bg-emerald-500' :
                                                            details.status === 'away' ? 'bg-amber-500' :
                                                                details.status === 'dnd' || details.status === 'busy' ? 'bg-rose-500' : 'bg-gray-400 dark:bg-gray-600'
                                                    )}
                                                        onMouseEnter={(e) => {
                                                            e.stopPropagation();
                                                            if (conv.type === 'DIRECT' && details.participantId) {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                // Center vertically relative to the dot, place to right
                                                                setHoverPosition({ x: rect.right, y: rect.top - 10 });
                                                                setHoveredUser({
                                                                    id: String(details.participantId),
                                                                    name: details.name,
                                                                    image: details.image,
                                                                    initials: details.initials,
                                                                    status: details.status,
                                                                    status_message: details.status_message,
                                                                    status_expiry: details.status_expiry,
                                                                    email: details.email,
                                                                    job_title: details.job_title
                                                                });
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.stopPropagation();
                                                            hoverTimeoutRef.current = setTimeout(() => {
                                                                setHoveredUser(null);
                                                            }, 500); // Increased timeout for better UX
                                                        }}
                                                        title={details.status === 'dnd' ? 'Do not disturb' : (details.status === 'busy' ? 'In a Meeting' : (details.status ? details.status.charAt(0).toUpperCase() + details.status.slice(1) : 'Offline'))}>
                                                        {(details.status === 'available' || details.status === 'online') && <Check size={8} strokeWidth={4} className="text-white" />}
                                                        {details.status === 'away' && <Clock size={8} strokeWidth={3} className="text-white" />}
                                                        {details.status === 'dnd' && <Minus size={8} strokeWidth={4} className="text-white" />}
                                                        {details.status === 'busy' && <PhoneIncoming size={6} strokeWidth={3} className="text-white" />}
                                                        {details.status === 'offline' && <div className="h-1.5 w-1.5 rounded-full border border-white dark:border-gray-900" />}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className={cn(
                                                            "font-semibold truncate",
                                                            isActive ? "text-primary dark:text-primary-light" : "text-gray-900 dark:text-gray-100"
                                                        )}>
                                                            {details.name}
                                                        </span>
                                                        {conv.last_message && (
                                                            <span className="text-[10px] font-medium text-gray-400">
                                                                {format(new Date(conv.last_message.created_at), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className={cn(
                                                            "text-xs truncate flex-1",
                                                            conv.unread_count > 0 ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-500"
                                                        )}>
                                                            {(() => {
                                                                if (!conv.last_message) return 'No messages';
                                                                if (conv.last_message.type === 'CALL') return '📞 Call record';
                                                                if (conv.last_message.type === 'IMAGE') return '🖼️ Image';
                                                                if (conv.last_message.type === 'FILE') return '📁 Attachment';
                                                                return conv.last_message.content;
                                                            })()}
                                                        </p>
                                                        {conv.unread_count > 0 && (
                                                            <span className="bg-primary-gradient text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm ml-2">
                                                                {conv.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                            </>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0">
                    {selectedConversationId ? (
                        <>
                            {/* Header */}
                            {/* Teams-style Header */}
                            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-5 h-14 flex-shrink-0">
                                <div className="flex items-center gap-6 min-w-0">
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {(() => {
                                            const conv = activeConversation || conversations?.find(c => String(c.id) === String(selectedConversationId));
                                            if (!conv) {
                                                return (
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                        <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                                                    </div>
                                                );
                                            }
                                            const details = getConversationDetails(conv);
                                            return (
                                                <>
                                                    <div className="relative">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                                            {details.image ? (
                                                                <img src={details.image} className="w-full h-full object-cover rounded-full" />
                                                            ) : details.initials}
                                                        </div>
                                                        <div className={cn(
                                                            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 cursor-help",
                                                            details.status === 'available' || details.status === 'online' ? 'bg-emerald-500' :
                                                                details.status === 'away' ? 'bg-amber-500' :
                                                                    details.status === 'dnd' || details.status === 'busy' ? 'bg-rose-500' : 'bg-gray-400 dark:bg-gray-600'
                                                        )} title={details.status ? details.status.charAt(0).toUpperCase() + details.status.slice(1) : 'Offline'} />
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate max-w-[150px]">
                                                        {details.name}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Tabs moved to same row */}
                                    <div className="flex items-center gap-1 h-full border-l border-gray-200 dark:border-gray-800 pl-4">
                                        {(['chat', 'files', 'photos'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setChatViewTab(tab)}
                                                className={cn(
                                                    "relative px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md",
                                                    chatViewTab === tab
                                                        ? "text-primary bg-primary/5"
                                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                )}
                                            >
                                                {tab === 'chat' ? 'Chat' : tab === 'files' ? 'Files' : 'Photos'}
                                                {chatViewTab === tab && (
                                                    <div className="absolute -bottom-2.5 left-0 right-0 h-[2px] bg-primary rounded-full" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {activeRoomCall === selectedConversationId && !activeCall && (
                                        <button
                                            onClick={() => joinActiveCall(selectedConversationId, 'video')}
                                            className="group relative flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-md transition-all border border-emerald-500/20 active:scale-95 mr-2"
                                            title="Meeting in progress - Click to Join"
                                        >
                                            <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </div>
                                            <Video size={16} className="animate-pulse" />
                                            <span className="text-[11px] font-bold">Join</span>
                                        </button>
                                    )}

                                    {/* Typing indicator in header */}
                                    {typingStatus[selectedConversationId || '']?.length > 0 && (
                                        <span className="text-[10px] text-primary font-medium italic animate-pulse mr-3 hidden sm:inline">
                                            {typingStatus[selectedConversationId!].join(', ')} typing...
                                        </span>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (activeCall) { toggleVideo(); return; }
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) initiateCall(details.participantId, details.name, 'video', selectedConversationId);
                                                else if (conv.type === 'GROUP') initiateCall(conv.id, conv.name || 'Group', 'video', conv.id, true);
                                            }
                                        }}
                                        className={cn(
                                            "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                            activeCall && !isVideoOff ? "text-primary" : "text-gray-500"
                                        )}
                                        title={activeCall ? "Toggle Video" : "Video Call"}
                                    >
                                        {activeCall && isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (activeCall) { toggleAudio(); return; }
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) initiateCall(details.participantId, details.name, 'audio', selectedConversationId);
                                                else if (conv.type === 'GROUP') initiateCall(conv.id, conv.name || 'Group', 'audio', conv.id, true);
                                            }
                                        }}
                                        className={cn(
                                            "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                            activeCall && !isMuted ? "text-emerald-500" : "text-gray-500"
                                        )}
                                        title={activeCall ? "Toggle Audio" : "Audio Call"}
                                    >
                                        {activeCall && isMuted ? <MicOff size={18} /> : <Phone size={18} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (activeConversation?.type === 'GROUP') {
                                                setIsViewingGroupProfile(true);
                                            } else {
                                                setIsGroupModalOpen(true);
                                            }
                                        }}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                                        title={activeConversation?.type === 'GROUP' ? "View members" : "Start a group chat"}
                                    >
                                        {activeConversation?.type === 'GROUP' ? <Users size={18} /> : <UserPlus size={18} />}
                                    </button>
                                    <button
                                        onClick={() => setShowMessageSearch(!showMessageSearch)}
                                        className={cn(
                                            "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                            showMessageSearch ? "text-primary bg-primary/10" : "text-gray-500"
                                        )}
                                        title="Search in conversation"
                                    >
                                        <Search size={18} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowHeaderMoreMenu(!showHeaderMoreMenu)}
                                            className={cn(
                                                "p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                                showHeaderMoreMenu ? "text-primary bg-primary/10" : "text-gray-500"
                                            )}
                                            title="More options"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>

                                        {showHeaderMoreMenu && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setShowHeaderMoreMenu(false)}
                                                />
                                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700 mb-1">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversation Actions</p>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setIsViewingGroupProfile(true);
                                                            setShowHeaderMoreMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <User size={16} className="text-gray-400" />
                                                        View {activeConversation?.type === 'GROUP' ? 'Group Info' : 'Participant Profile'}
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setShowPins(!showPins);
                                                            setShowHeaderMoreMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <Pin size={16} className={cn("text-gray-400", showPins && "text-primary fill-primary")} />
                                                        {showPins ? 'Hide' : 'Show'} Pinned Messages
                                                    </button>

                                                    <button
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <BellOff size={16} className="text-gray-400" />
                                                        Mute Notifications
                                                    </button>

                                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

                                                    <button
                                                        onClick={handleClearChat}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                    >
                                                        <Eraser size={16} />
                                                        Clear Chat History
                                                    </button>

                                                    <button
                                                        onClick={handleDeleteConversation}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                        Delete Conversation
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content area: Messages + Search side panel */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Main messages column */}
                                <div className="flex-1 flex flex-col min-w-0">

                                    {/* Pinned Messages Display */}
                                    {showPins && messages?.some(m => m.is_pinned) && (
                                        <div className="bg-primary/5 border-b border-primary/10 px-6 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar animate-in slide-in-from-top duration-300">
                                            <div className="flex-shrink-0 flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                                                <Pin size={12} className="fill-primary" />
                                                Pinned
                                            </div>
                                            <div className="flex items-center gap-3 pr-4">
                                                {messages.filter(m => m.is_pinned).map(msg => (
                                                    <div
                                                        key={msg.id}
                                                        onClick={() => {
                                                            const el = document.getElementById(`message-${msg.id}`);
                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            setHighlightedMessageId(msg.id);
                                                            setTimeout(() => setHighlightedMessageId(null), 2000);
                                                        }}
                                                        className="flex-shrink-0 max-w-[200px] bg-white dark:bg-gray-800 border border-primary/20 rounded-lg px-3 py-1.5 cursor-pointer hover:shadow-md transition-all group relative"
                                                    >
                                                        <p className="text-xs truncate font-medium text-gray-700 dark:text-gray-200">{msg.content}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">by {msg.sender_first_name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Messages - only show on Chat tab */}
                                    {chatViewTab === 'chat' && <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-white dark:bg-gray-900 relative">
                                        {(!messages || messages.length === 0) ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500 opacity-60 select-none">
                                                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    <MessageSquare size={40} className="text-gray-300 dark:text-gray-600" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No messages yet</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                                                    Start the conversation by sending a message below.
                                                </p>
                                            </div>
                                        ) : messages?.map((msg, index) => {
                                            const isMe = msg.sender_id === user?.id;
                                            const prevMsg = index > 0 ? messages[index - 1] : null;
                                            const isSameSender = prevMsg && prevMsg.sender_id === msg.sender_id;
                                            const showAvatar = !isMe && !isSameSender;

                                            if (msg.type === 'CALL') {
                                                let callData = { callType: 'audio', duration: 0, status: 'ended' };
                                                try { callData = JSON.parse(msg.content); } catch (e) { }
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-6">
                                                        <div className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-2 text-xs text-gray-500 flex items-center gap-3 border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                                                            <div className={cn("p-1.5 rounded-full text-white", callData.status === 'missed' ? "bg-rose-500" : "bg-emerald-500")}>
                                                                {callData.callType === 'video' ? <Video size={12} /> : <Phone size={12} />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                                    {callData.status === 'missed' ? 'Missed call' : `Call ended`}
                                                                </span>
                                                                <span className="opacity-70">
                                                                    {callData.status !== 'missed' && `${Math.floor(callData.duration / 60)}:${(callData.duration % 60).toString().padStart(2, '0')} • `}
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isEditing = editingMessageId === msg.id;
                                            const isHighlighted = highlightedMessageId === msg.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    id={`message-${msg.id}`}
                                                    className={cn(
                                                        "flex items-end gap-3 px-2 group transition-all duration-500",
                                                        isMe ? "flex-row-reverse" : "flex-row",
                                                        isSameSender ? "mt-1" : "mt-6",
                                                        isHighlighted && "bg-primary/10 rounded-xl scale-[1.02] ring-2 ring-primary/30"
                                                    )}
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8">
                                                        {showAvatar ? (
                                                            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                                                                {msg.sender_profile_pic ? (
                                                                    <img src={resolveImageUrl(msg.sender_profile_pic)} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-primary">{msg.sender_first_name?.[0] || 'U'}</span>
                                                                )}
                                                            </div>
                                                        ) : <div className="w-8" />}
                                                    </div>

                                                    <div className={cn(
                                                        "max-w-[75%] min-w-[60px] relative transition-all duration-200",
                                                        isMe ? "items-end" : "items-start",
                                                        msg.reactions && msg.reactions.length > 0 ? "mb-2" : "" // Add space for overlapping reactions
                                                    )}>
                                                        {!isMe && !isSameSender && (
                                                            <div className="flex items-center gap-2 ml-1 mb-1">
                                                                <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                                                                    {msg.sender_first_name} {msg.sender_last_name}
                                                                </span>
                                                                <span className="text-[11px] text-gray-400">
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Threading UI: Show Parent Message */}
                                                        {msg.parent_message && !isEditing && (
                                                            <div className={cn(
                                                                "text-xs mb-1 px-3 py-1 rounded-t-lg border-l-4 opacity-80 cursor-pointer hover:opacity-100",
                                                                isMe ? "bg-white/10 border-white text-white" : "bg-gray-200 dark:bg-gray-700 border-gray-400 text-gray-600 dark:text-gray-300"
                                                            )}>
                                                                <span className="font-bold mr-1">{msg.parent_message.sender_first_name}:</span>
                                                                {msg.parent_message.content.substring(0, 30)}...
                                                            </div>
                                                        )}

                                                        <div className={cn(
                                                            "rounded-lg px-4 py-2.5 transition-all duration-200 relative",
                                                            isMe
                                                                ? "bg-primary-gradient text-white"
                                                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                        )}>
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                                    <input
                                                                        type="text"
                                                                        value={editContent}
                                                                        onChange={(e) => setEditContent(e.target.value)}
                                                                        className="text-gray-900 text-sm rounded p-1 w-full"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveEdit(msg.id);
                                                                            if (e.key === 'Escape') cancelEditing();
                                                                        }}
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={cancelEditing} className="p-1 hover:bg-white/20 rounded"><X size={14} /></button>
                                                                        <button onClick={() => saveEdit(msg.id)} className="p-1 hover:bg-white/20 rounded"><Check size={14} /></button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {msg.type === 'IMAGE' || (msg.type === 'FILE' && msg.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.file_url)) ? (
                                                                        <div
                                                                            className="relative group/img cursor-pointer max-w-[300px]"
                                                                            onClick={() => {
                                                                                const url = resolveImageUrl(msg.file_url) || '';
                                                                                openLightbox(
                                                                                    url,
                                                                                    msg.content,
                                                                                    `${msg.sender_first_name || ''} ${msg.sender_last_name || ''}`.trim(),
                                                                                    format(new Date(msg.created_at), 'dd MMM yyyy, HH:mm')
                                                                                );
                                                                            }}
                                                                        >
                                                                            <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                                                                <img
                                                                                    src={resolveImageUrl(msg.file_url)}
                                                                                    alt={msg.content}
                                                                                    className="w-full h-auto max-h-[350px] object-cover transition-transform duration-500 group-hover/img:scale-105"
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Image+Unavailable';
                                                                                    }}
                                                                                />
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                                                                    <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">Click to view</span>
                                                                                </div>
                                                                            </div>
                                                                            <p className={cn("text-[9px] mt-1 font-medium truncate opacity-60", isMe ? "text-white text-right" : "text-gray-500")}>
                                                                                {msg.content}
                                                                            </p>
                                                                        </div>
                                                                    ) : msg.type === 'FILE' ? (
                                                                        (() => {
                                                                            const fileUrl = msg.file_url?.startsWith('http') ? msg.file_url : resolveImageUrl(msg.file_url);
                                                                            const ext = msg.content?.split('.').pop()?.toLowerCase() || '';
                                                                            const isPdf = ext === 'pdf';
                                                                            const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
                                                                            const isDoc = ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext);
                                                                            const isSheet = ['xls', 'xlsx', 'csv', 'ods'].includes(ext);
                                                                            const isPresentation = ['ppt', 'pptx', 'odp'].includes(ext);
                                                                            const isVideo = ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext);
                                                                            const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext);

                                                                            const fileConfig = isPdf
                                                                                ? { icon: FileText, color: 'text-red-500', bg: isMe ? 'bg-red-400/20' : 'bg-red-50 dark:bg-red-900/20', accent: 'bg-red-500', label: 'PDF Document' }
                                                                                : isArchive
                                                                                    ? { icon: FileArchive, color: 'text-amber-500', bg: isMe ? 'bg-amber-400/20' : 'bg-amber-50 dark:bg-amber-900/20', accent: 'bg-amber-500', label: 'Archive' }
                                                                                    : isDoc
                                                                                        ? { icon: FileText, color: 'text-blue-500', bg: isMe ? 'bg-blue-400/20' : 'bg-blue-50 dark:bg-blue-900/20', accent: 'bg-blue-500', label: 'Document' }
                                                                                        : isSheet
                                                                                            ? { icon: FileSpreadsheet, color: 'text-emerald-500', bg: isMe ? 'bg-emerald-400/20' : 'bg-emerald-50 dark:bg-emerald-900/20', accent: 'bg-emerald-500', label: 'Spreadsheet' }
                                                                                            : isPresentation
                                                                                                ? { icon: FileText, color: 'text-orange-500', bg: isMe ? 'bg-orange-400/20' : 'bg-orange-50 dark:bg-orange-900/20', accent: 'bg-orange-500', label: 'Presentation' }
                                                                                                : isVideo
                                                                                                    ? { icon: Video, color: 'text-purple-500', bg: isMe ? 'bg-purple-400/20' : 'bg-purple-50 dark:bg-purple-900/20', accent: 'bg-purple-500', label: 'Video' }
                                                                                                    : isAudio
                                                                                                        ? { icon: Phone, color: 'text-pink-500', bg: isMe ? 'bg-pink-400/20' : 'bg-pink-50 dark:bg-pink-900/20', accent: 'bg-pink-500', label: 'Audio' }
                                                                                                        : { icon: File, color: 'text-gray-500', bg: isMe ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800', accent: 'bg-gray-500', label: 'File' };

                                                                            const IconComponent = fileConfig.icon;

                                                                            return (
                                                                                <div
                                                                                    className={cn(
                                                                                        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group/file min-w-[220px] max-w-[300px]",
                                                                                        isMe ? "bg-white/10 hover:bg-white/20" : "bg-white dark:bg-gray-800/90 hover:shadow-md border border-gray-100 dark:border-gray-700"
                                                                                    )}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        if (isPdf) {
                                                                                            window.open(fileUrl, '_blank', 'noopener,noreferrer');
                                                                                        } else {
                                                                                            if (fileUrl) handleDownload(fileUrl, msg.content);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <div className={cn("relative p-3 rounded-xl flex-shrink-0 transition-transform group-hover/file:scale-110", fileConfig.bg)}>
                                                                                        <IconComponent size={24} className={isMe ? 'text-white' : fileConfig.color} />
                                                                                        <span className={cn("absolute -bottom-1 -right-1 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md uppercase leading-none shadow-sm", fileConfig.accent)}>
                                                                                            {ext || 'FILE'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <p className={cn("text-sm font-semibold truncate", isMe ? 'text-white' : 'text-gray-900 dark:text-gray-100')}>
                                                                                            {msg.content}
                                                                                        </p>
                                                                                        <p className={cn("text-[10px] mt-0.5", isMe ? 'text-white/60' : 'text-gray-400')}>
                                                                                            {fileConfig.label} • {isPdf ? 'Tap to open' : 'Tap to download'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className={cn(
                                                                                        "p-2 rounded-lg opacity-0 group-hover/file:opacity-100 transition-all flex-shrink-0",
                                                                                        isMe ? "hover:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                                    )}>
                                                                                        {isPdf ? <ExternalLink size={16} className={isMe ? 'text-white' : 'text-gray-500'} /> : <Download size={16} className={isMe ? 'text-white' : 'text-gray-500'} />}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                                            {msg.content}
                                                                            {msg.is_edited && <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>}
                                                                        </p>
                                                                    )}

                                                                    {msg.is_pinned && (
                                                                        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 p-1 rounded-full border border-primary/20 shadow-md">
                                                                            <Pin size={10} className="text-primary fill-primary" />
                                                                        </div>
                                                                    )}

                                                                    {/* Reactions UI - Overlapping */}
                                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                                        <div className={cn(
                                                                            "absolute -bottom-3 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-md border border-gray-100 dark:border-gray-700 z-10 animate-in zoom-in-50 duration-200",
                                                                            "left-0 -translate-x-2"
                                                                        )}>
                                                                            {(() => {
                                                                                const grouped = msg.reactions.reduce<Record<string, number>>((acc, r) => {
                                                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                                                    return acc;
                                                                                }, {});
                                                                                return Object.entries(grouped).map(([emoji, count]) => (
                                                                                    <button
                                                                                        key={emoji}
                                                                                        onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji, msg.reactions); }}
                                                                                        className={cn(
                                                                                            "flex items-center gap-1 px-1 rounded-full transition-colors",
                                                                                            msg.reactions?.some(r => String(r.user_id) === String(user?.id) && r.emoji === emoji)
                                                                                                ? "bg-primary/10 text-primary"
                                                                                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                                        )}
                                                                                    >
                                                                                        <span className="text-[11px]">{emoji}</span>
                                                                                        {Number(count) > 1 && <span className="text-[9px] font-bold">{count}</span>}
                                                                                    </button>
                                                                                ));
                                                                            })()}
                                                                        </div>
                                                                    )}

                                                                    <div className="flex justify-end mt-1 items-center gap-1">
                                                                        <p className={cn("text-[9px]", isMe ? "text-white/80" : "text-gray-400")}>
                                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                                        </p>
                                                                        {isMe && (
                                                                            <div className={cn("flex -space-x-1", msg.is_read ? "text-blue-200" : "text-white/60")}>
                                                                                <Check size={12} strokeWidth={3} />
                                                                                <Check size={12} strokeWidth={3} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {!isEditing && (
                                                            <div className={cn(
                                                                "absolute opacity-0 group-hover:opacity-100 transition-all duration-200 z-20",
                                                                isMe ? "right-2 -top-5" : "left-12 -top-5"
                                                            )}>
                                                                {/* Teams-style action bar */}
                                                                <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-lg shadow-black/8 dark:shadow-black/30 border border-gray-200 dark:border-gray-600 overflow-visible">
                                                                    {/* Quick emoji reactions */}
                                                                    {['👍', '❤️', '😆', '😮'].map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={() => handleToggleReaction(msg.id, emoji, msg.reactions)}
                                                                            className={cn(
                                                                                "w-8 h-8 flex items-center justify-center text-base hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 hover:scale-110 first:rounded-l-lg",
                                                                                msg.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji) && "bg-primary/10"
                                                                            )}
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}

                                                                    {/* More reactions button */}
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                                                                            title="More reactions"
                                                                        >
                                                                            <Smile size={16} className={showReactionPicker === msg.id ? 'text-primary' : ''} />
                                                                        </button>
                                                                        {showReactionPicker === msg.id && (
                                                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                                                <div className="flex gap-1">
                                                                                    {['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉', '💯', '🙏'].map(emoji => (
                                                                                        <button
                                                                                            key={emoji}
                                                                                            onClick={() => {
                                                                                                handleToggleReaction(msg.id, emoji, msg.reactions);
                                                                                                setShowReactionPicker(null);
                                                                                            }}
                                                                                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-transform hover:scale-125"
                                                                                        >
                                                                                            {emoji}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Separator */}
                                                                    <div className="w-[1px] h-5 bg-gray-200 dark:bg-gray-600" />

                                                                    {/* Reply button */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setReplyToMessage(msg);
                                                                        }}
                                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                                                                        title="Reply"
                                                                    >
                                                                        <CornerUpLeft size={16} />
                                                                    </button>

                                                                    {/* More options button */}
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setShowMoreMenu(showMoreMenu === msg.id ? null : msg.id)}
                                                                            className={cn(
                                                                                "w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition-all duration-150",
                                                                                showMoreMenu === msg.id && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                                            )}
                                                                            title="More options"
                                                                        >
                                                                            <MoreHorizontal size={16} />
                                                                        </button>

                                                                        {/* More options dropdown */}
                                                                        {showMoreMenu === msg.id && (
                                                                            <>
                                                                                {/* Invisible overlay to close menu on click outside */}
                                                                                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(null)} />
                                                                                <div className={cn(
                                                                                    "absolute top-full mt-1 z-40 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl shadow-black/10 dark:shadow-black/30 border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in slide-in-from-top-2 duration-150",
                                                                                    isMe ? "right-0" : "left-0"
                                                                                )}>
                                                                                    <button
                                                                                        onClick={() => { setForwardingMessage(msg); setShowMoreMenu(null); }}
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                                                    >
                                                                                        <Share size={16} className="text-gray-400" />
                                                                                        Forward
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            navigator.clipboard.writeText(msg.content);
                                                                                            setShowMoreMenu(null);
                                                                                            import('react-hot-toast').then(({ toast }) => toast.success('Copied to clipboard'));
                                                                                        }}
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                                                    >
                                                                                        <Copy size={16} className="text-gray-400" />
                                                                                        Copy message
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => { handleTogglePin(msg.id); setShowMoreMenu(null); }}
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                                                    >
                                                                                        <Pin size={16} className={cn("text-gray-400", msg.is_pinned && "fill-primary text-primary")} />
                                                                                        {msg.is_pinned ? 'Unpin message' : 'Pin for everyone'}
                                                                                    </button>

                                                                                    {isMe && msg.type === 'TEXT' && (
                                                                                        <>
                                                                                            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                                                                                            <button
                                                                                                onClick={() => { startEditing(msg); setShowMoreMenu(null); }}
                                                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                                                            >
                                                                                                <Edit2 size={16} className="text-gray-400" />
                                                                                                Edit
                                                                                            </button>
                                                                                        </>
                                                                                    )}

                                                                                    <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                                                                                    <button
                                                                                        onClick={() => { setDeletingMessage(msg); setShowMoreMenu(null); }}
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                                    >
                                                                                        <Trash2 size={16} />
                                                                                        Delete
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>}

                                    {/* FILES TAB */}
                                    {chatViewTab === 'files' && (
                                        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                                            {(() => {
                                                const fileMessages = messages?.filter(m => m.type === 'FILE' && m.file_url) || [];
                                                if (fileMessages.length === 0) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                                                <FileText size={28} className="text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No files shared yet</p>
                                                            <p className="text-xs text-gray-400 mt-1">Files shared in this conversation will appear here</p>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                        {/* Table Header */}
                                                        <div className="flex items-center gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                                                            <span className="flex-1">Name</span>
                                                            <span className="w-32 text-center">Shared by</span>
                                                            <span className="w-28 text-center">Date</span>
                                                            <span className="w-16 text-center">Action</span>
                                                        </div>
                                                        {fileMessages.map(msg => {
                                                            const fileUrl = msg.file_url?.startsWith('http') ? msg.file_url : resolveImageUrl(msg.file_url);
                                                            const ext = msg.content?.split('.').pop()?.toLowerCase() || '';
                                                            const isPdf = ext === 'pdf';
                                                            const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
                                                            const isDoc = ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext);
                                                            const isSheet = ['xls', 'xlsx', 'csv', 'ods'].includes(ext);

                                                            const fileIcon = isPdf ? FileText : isArchive ? FileArchive : isDoc ? FileText : isSheet ? FileSpreadsheet : File;
                                                            const iconColor = isPdf ? 'text-red-500' : isArchive ? 'text-amber-500' : isDoc ? 'text-blue-500' : isSheet ? 'text-emerald-500' : 'text-gray-500';
                                                            const bgColor = isPdf ? 'bg-red-50 dark:bg-red-900/20' : isArchive ? 'bg-amber-50 dark:bg-amber-900/20' : isDoc ? 'bg-blue-50 dark:bg-blue-900/20' : isSheet ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800';
                                                            const IconComp = fileIcon;

                                                            return (
                                                                <div
                                                                    key={msg.id}
                                                                    className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                                                    onClick={() => isPdf ? (fileUrl && window.open(fileUrl, '_blank')) : (fileUrl && handleDownload(fileUrl, msg.content))}
                                                                >
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <div className={cn('p-2.5 rounded-lg flex-shrink-0', bgColor)}>
                                                                            <IconComp size={20} className={iconColor} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{msg.content}</p>
                                                                            <p className="text-xs text-gray-400 mt-0.5">{ext.toUpperCase()} file</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="w-32 text-center text-xs text-gray-500 truncate">
                                                                        {msg.sender_first_name} {msg.sender_last_name}
                                                                    </span>
                                                                    <span className="w-28 text-center text-xs text-gray-400">
                                                                        {format(new Date(msg.created_at), 'dd MMM yyyy')}
                                                                    </span>
                                                                    <div className="w-16 flex justify-center">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); if (fileUrl) handleDownload(fileUrl, msg.content); }}
                                                                            className="p-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500"
                                                                            title="Download"
                                                                        >
                                                                            <Download size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* PHOTOS TAB */}
                                    {chatViewTab === 'photos' && (
                                        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-6">
                                            {(() => {
                                                const photoMessages = messages?.filter(m =>
                                                    m.type === 'IMAGE' || (m.type === 'FILE' && m.file_url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(m.file_url))
                                                ) || [];
                                                if (photoMessages.length === 0) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                                                <Image size={28} className="text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No photos shared yet</p>
                                                            <p className="text-xs text-gray-400 mt-1">Photos shared in this conversation will appear here</p>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{photoMessages.length} photo{photoMessages.length !== 1 ? 's' : ''}</h3>
                                                        </div>
                                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                            {photoMessages.map(msg => {
                                                                const imgUrl = resolveImageUrl(msg.file_url) || '';
                                                                return (
                                                                    <div
                                                                        key={msg.id}
                                                                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-800"
                                                                        onClick={() => openLightbox(
                                                                            imgUrl,
                                                                            msg.content,
                                                                            `${msg.sender_first_name || ''} ${msg.sender_last_name || ''}`.trim(),
                                                                            format(new Date(msg.created_at), 'dd MMM yyyy, HH:mm')
                                                                        )}
                                                                    >
                                                                        <img
                                                                            src={resolveImageUrl(msg.file_url)}
                                                                            alt={msg.content}
                                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Image'; }}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end">
                                                                            <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity w-full">
                                                                                <p className="text-[10px] text-white font-medium truncate">{msg.sender_first_name}</p>
                                                                                <p className="text-[9px] text-white/70">{format(new Date(msg.created_at), 'dd MMM')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {chatViewTab === 'chat' && <>
                                        {/* Typing Indicator */}
                                        {typingStatus[selectedConversationId || '']?.length > 0 && (
                                            <TypingIndicator
                                                users={typingStatus[selectedConversationId!]}
                                                className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                                            />
                                        )}

                                        {/* Teams-style Input Area */}
                                        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                            {replyToMessage && (
                                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-5 py-2 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <div className="w-1 h-8 bg-primary rounded-full" />
                                                        <div>
                                                            <span className="font-semibold text-primary text-xs">{replyToMessage.sender_first_name || 'User'}</span>
                                                            <p className="text-gray-500 text-xs truncate max-w-[300px]">{replyToMessage.content.substring(0, 60)}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setReplyToMessage(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={14} /></button>
                                                </div>
                                            )}
                                            <form onSubmit={handleSendMessage} className="px-5 py-3">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={handleFileSelect}
                                                />

                                                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all bg-white dark:bg-gray-900">
                                                    <input
                                                        type="text"
                                                        value={messageInput}
                                                        onChange={handleInputChange}
                                                        placeholder="Type a message"
                                                        className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm py-3 px-4 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                                    />

                                                    <div className="flex items-center gap-0.5 pr-2">
                                                        {/* Emoji */}
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                                title="Emoji"
                                                            >
                                                                <Smile size={20} />
                                                            </button>
                                                            {showEmojiPicker && (
                                                                <>
                                                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />
                                                                    <EmojiPicker
                                                                        onSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                                                                        onClose={() => setShowEmojiPicker(false)}
                                                                        className="left-auto -right-10 sm:right-0 origin-bottom-right z-[100]"
                                                                    />
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Image/GIF */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.accept = 'image/*';
                                                                input.onchange = (e) => {
                                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                                    if (file && fileInputRef.current) {
                                                                        const dt = new DataTransfer();
                                                                        dt.items.add(file);
                                                                        fileInputRef.current.files = dt.files;
                                                                        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                                                                    }
                                                                };
                                                                input.click();
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                            title="Send image"
                                                        >
                                                            <Image size={20} />
                                                        </button>

                                                        {/* Attachment */}
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                            title="Attach file"
                                                        >
                                                            <Paperclip size={20} />
                                                        </button>

                                                        {/* More options */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPins(!showPins)}
                                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                            title="More options"
                                                        >
                                                            <Plus size={20} />
                                                        </button>

                                                        {/* Send */}
                                                        <button
                                                            type="submit"
                                                            disabled={!messageInput.trim()}
                                                            className="p-2 text-gray-400 hover:text-primary disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-primary/10"
                                                            title="Send"
                                                        >
                                                            <Send size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </>}
                                </div>{/* End main messages column */}

                                {/* Search Side Panel */}
                                {showMessageSearch && (
                                    <MessageSearch
                                        messages={messages || []}
                                        onResultSelect={(messageId) => {
                                            setChatViewTab('chat');
                                            setHighlightedMessageId(messageId);
                                            // Small delay to let the chat tab render before scrolling
                                            setTimeout(() => {
                                                const element = document.getElementById(`message-${messageId}`);
                                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 50);
                                            setTimeout(() => setHighlightedMessageId(null), 2500);
                                        }}
                                        onClose={() => setShowMessageSearch(false)}
                                    />
                                )}
                            </div>{/* End flex overflow-hidden */}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="relative mb-6">
                                <div className="h-24 w-24 bg-primary-10 dark:bg-primary-20 rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
                                    <Send size={40} className="text-primary" />
                                </div>
                                <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary-gradient rounded-xl flex items-center justify-center shadow-md">
                                    <Plus size={16} className="text-white" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">Start a Conversation</h3>
                            <p className="text-sm text-gray-400 text-center max-w-xs mb-6">Select a conversation from the sidebar or start a new chat with your team members</p>
                            <button
                                onClick={() => setIsSelectingContact(true)}
                                className="px-6 py-2.5 bg-primary-gradient text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-105"
                            >
                                New Conversation
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <ForwardModal
                isOpen={!!forwardingMessage}
                onClose={() => setForwardingMessage(null)}
                conversations={conversations || []}
                message={forwardingMessage}
                onForward={(targetId) => forwardingMessage && handleForward(forwardingMessage, targetId)}
            />
            {isViewingGroupProfile && activeConversation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-sm text-gray-900 dark:text-white">Group Info</h3>
                            <button onClick={() => setIsViewingGroupProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-8 text-center bg-gradient-to-b from-primary/5 to-transparent">
                            <div className="w-24 h-24 bg-primary-gradient rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20 mb-4">
                                {getConversationDetails(activeConversation).initials}
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">{getConversationDetails(activeConversation).name}</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeConversation.participants?.length || 0} Operatives Enrolled</p>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{activeConversation.type === 'GROUP' ? 'Team Members' : 'Participants'}</h4>
                                {activeConversation.type === 'GROUP' && (
                                    <button
                                        onClick={() => setIsAddingParticipant(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                        <UserPlus size={12} strokeWidth={3} /> Add
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {activeConversation.participants?.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 group/participant">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ring-1 ring-primary/20">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{p.first_name} {p.last_name}</p>
                                                <p className="text-[9px] font-medium text-gray-500 uppercase tracking-tighter">{p.designation || 'Member'}</p>
                                            </div>
                                        </div>
                                        {p.id === user?.id ? (
                                            <span className="text-[8px] font-black text-primary uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-lg">You</span>
                                        ) : (
                                            activeConversation.type === 'GROUP' && (
                                                <button
                                                    onClick={() => handleRemoveParticipant(p.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover/participant:opacity-100 transition-all"
                                                    title="Remove participant"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-3 mt-2">
                            <button
                                onClick={() => setIsViewingGroupProfile(false)}
                                className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <DeleteMessageModal
                isOpen={!!deletingMessage}
                onClose={() => setDeletingMessage(null)}
                isMe={deletingMessage?.sender_id === user?.id}
                onDelete={(mode) => deletingMessage && handleDeleteMessage(deletingMessage.id, mode)}
            />
            <AddParticipantModal
                isOpen={isAddingParticipant}
                onClose={() => setIsAddingParticipant(false)}
                contacts={contacts || []}
                alreadyParticipantIds={activeConversation?.participants?.map(p => p.id) || []}
                onAdd={handleAddParticipants}
            />
            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                contacts={contacts || []}
                isLoading={isLoadingContacts}
                initialSelectedUserIds={otherParticipantId ? [otherParticipantId] : []}
                onCreate={async (name, userIds) => {
                    try {
                        const res = await api.post('/chat/groups', { name, participantIds: userIds });
                        const newGroup = res.data.data;
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                        setSelectedConversationId(newGroup.id);
                        import('react-hot-toast').then(({ toast }) => toast.success(`Group "${name}" created`));
                    } catch (e) {
                        console.error("Failed to create group", e);
                        import('react-hot-toast').then(({ toast }) => toast.error('Failed to create group'));
                    }
                }}
            />
            {/* Image Lightbox Viewer */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={closeLightbox}
                >
                    {/* Top Bar */}
                    <div
                        className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                                {lightboxImage.sender?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">{lightboxImage.sender || 'Unknown'}</p>
                                <p className="text-white/50 text-xs">{lightboxImage.time}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setLightboxZoom(z => Math.max(z - 0.25, 0.25))}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Zoom Out (-)"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <span className="text-white/50 text-xs font-mono w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
                            <button
                                onClick={() => setLightboxZoom(z => Math.min(z + 0.25, 5))}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Zoom In (+)"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <button
                                onClick={() => setLightboxZoom(1)}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Reset Zoom"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => setLightboxRotation(r => r + 90)}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Rotate (R)"
                            >
                                <RotateCw size={18} />
                            </button>
                            <div className="w-px h-6 bg-white/20 mx-2" />
                            <button
                                onClick={() => handleDownload(lightboxImage.url, lightboxImage.name)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm font-medium"
                                title="Download"
                            >
                                <Download size={16} />
                                Download
                            </button>
                            <button
                                onClick={closeLightbox}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-red-500/20 rounded-xl transition-all ml-2"
                                title="Close (Esc)"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* Image Container */}
                    <div
                        className="flex-1 flex items-center justify-center overflow-auto p-8"
                        onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
                    >
                        <img
                            src={lightboxImage.url}
                            alt={lightboxImage.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300 ease-out select-none"
                            style={{
                                transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                                cursor: lightboxZoom > 1 ? 'grab' : 'default'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Unavailable';
                            }}
                        />
                    </div>

                    {/* Bottom bar - filename */}
                    <div className="px-6 py-3 bg-gradient-to-t from-black/80 to-transparent text-center">
                        <p className="text-white/60 text-xs font-medium truncate max-w-md mx-auto">{lightboxImage.name}</p>
                    </div>
                </div>
            )}
            {/* File Preview Viewer (PDFs etc.) */}
            {filePreview && (
                <div
                    className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={closeFilePreview}
                >
                    {/* Top Bar */}
                    <div
                        className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative p-2.5 rounded-xl bg-red-500/10">
                                <FileText size={22} className="text-red-400" />
                                <span className="absolute -bottom-1 -right-1 text-[7px] font-black text-white px-1 py-0.5 rounded bg-red-500 uppercase leading-none">
                                    {filePreview.ext || 'FILE'}
                                </span>
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold truncate max-w-[400px]">{filePreview.name}</p>
                                <p className="text-white/40 text-xs">
                                    {filePreview.sender && `Sent by ${filePreview.sender}`}
                                    {filePreview.time && ` • ${filePreview.time}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDownload(filePreview.url, filePreview.name)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm font-medium"
                                title="Download"
                            >
                                <Download size={16} />
                                Download
                            </button>
                            <button
                                onClick={() => window.open(filePreview.url, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm font-medium"
                                title="Open in new tab"
                            >
                                <ExternalLink size={16} />
                                New Tab
                            </button>
                            <button
                                onClick={closeFilePreview}
                                className="p-2.5 text-white/70 hover:text-white hover:bg-red-500/20 rounded-xl transition-all ml-2"
                                title="Close (Esc)"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div
                        className="flex-1 w-full bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <iframe
                            src={filePreview.url}
                            className="w-full h-full border-0"
                            title={filePreview.name}
                        />
                    </div>
                </div>
            )}
            {hoveredUser && hoverPosition && (
                <UserHoverCard
                    user={hoveredUser}
                    position={hoverPosition}
                    onClose={() => setHoveredUser(null)}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onChat={() => {
                        const conv = conversations?.find(c => c.type === 'DIRECT' && c.participants?.some(p => String(p.id) === hoveredUser.id));
                        if (conv) setSelectedConversationId(conv.id);
                        setHoveredUser(null);
                    }}
                    onVideo={() => {
                        if (hoveredUser.id) initiateCall(hoveredUser.id, hoveredUser.name, 'video');
                        setHoveredUser(null);
                    }}
                    onCall={() => {
                        if (hoveredUser.id) initiateCall(hoveredUser.id, hoveredUser.name, 'audio');
                        setHoveredUser(null);
                    }}
                />
            )}
        </DashboardLayout>
    );
};

export default ChatPage;

