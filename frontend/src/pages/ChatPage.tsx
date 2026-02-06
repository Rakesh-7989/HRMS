import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import { format } from 'date-fns';
import { Send, Phone, Video, MoreVertical, Search, Paperclip, Edit2, Trash2, X, Check, Users, Plus, Smile, Clock, Minus, PhoneIncoming, Pin, ArrowRight, MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { API_BASE_URL } from '@/utils/constants';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
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
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'TEXT' | 'FILE' | 'CALL';
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
        type: 'TEXT' | 'FILE' | 'CALL';
    };
    unread_count: number;
    updated_at: string;
}

const ForwardModal = ({ isOpen, onClose, conversations, onForward, message }: { isOpen: boolean; onClose: () => void; conversations: Conversation[]; onForward: (conversationId: string) => void; message: Message | null }) => {
    const [search, setSearch] = useState('');
    if (!isOpen || !message) return null;

    const filtered = conversations.filter(c => (c.name || 'Group').toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5 border dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Forward Message</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
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
                                <p className="text-sm font-medium truncate">{conv.name || 'Group Chat'}</p>
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

const CreateGroupModal = ({ isOpen, onClose, contacts, onCreate, isLoading }: { isOpen: boolean; onClose: () => void; contacts: User[]; onCreate: (name: string, userIds: string[]) => void; isLoading: boolean }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    if (!isOpen) return null;

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
                        <h3 className="text-xl font-bold text-primary-gradient bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Create Group Chat</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Add members to start a group conversation</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            placeholder="e.g. Marketing Team"
                            required
                        />
                    </div>
                    <div className="mb-5">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Add Participants</label>
                        <div className="max-h-52 min-h-[120px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1.5 bg-gray-50/50 dark:bg-gray-800/30">
                            {isLoading ? (
                                <p className="text-sm text-gray-500 text-center py-8">Loading contacts...</p>
                            ) : contacts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No contacts found</p>
                            ) : (
                                contacts.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleUser(user.id)}
                                        className={cn(
                                            "p-3 flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200",
                                            selectedUsers.includes(user.id)
                                                ? "bg-primary-10 border border-primary/20"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                                            selectedUsers.includes(user.id)
                                                ? 'bg-primary-gradient border-transparent'
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
                            Create Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const ChatPage = () => {
    const { user } = useAuth();
    const {
        socket, joinRoom, markAsRead, initiateCall,
        typingStatus, sendTypingStatus,
        activeCall, isMuted, isVideoOff, toggleAudio, toggleVideo,
        activeRoomCall, joinActiveCall
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
    const [searchResults, setSearchResults] = useState<any[]>([]); // Global search results
    const [userStatus, setUserStatus] = useState<'ONLINE' | 'AWAY' | 'DND' | 'BUSY' | 'OFFLINE'>('ONLINE'); // Local status state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // Message ID for reaction picker
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [showPins, setShowPins] = useState(false);

    const handleStatusChange = async (status: 'ONLINE' | 'AWAY' | 'DND' | 'BUSY' | 'OFFLINE') => {
        setUserStatus(status);
        try {
            await api.post('/chat/status', { status });
        } catch (e) { console.error(e); }
    };

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
        enabled: !!selectedConversationId,
    });

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
                        const exists = m.reactions?.some(r => r.user_id === data.userId && r.emoji === data.emoji);
                        if (exists) return m;
                        // Add reaction locally
                        return { ...m, reactions: [...(m.reactions || []), { id: `temp-${Date.now()}`, user_id: data.userId, emoji: data.emoji }] };
                    }
                    return m;
                });
            });
        });

        socket.on('reaction_removed', (data: { messageId: string, userId: string, emoji: string }) => {
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
                return old.map(m => {
                    if (m.id === data.messageId) {
                        return { ...m, reactions: m.reactions?.filter(r => !(r.user_id === data.userId && r.emoji === data.emoji)) };
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
                await api.post(`/chat/conversations/${selectedConversationId}/messages`, {
                    content: file.name,
                    type: 'FILE',
                    file_url: fileUrl
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

    const handleDeleteMessage = async (messageId: string) => {
        if (!selectedConversationId) return;
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await api.delete(`/chat/conversations/${selectedConversationId}/messages/${messageId}`);
            // Optimistic update
            queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => old.filter(m => m.id !== messageId));
        } catch (err) {
            console.error("Failed to delete", err);
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
        } catch (err) {
            console.error("Failed to update", err);
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
                await api.delete(`/chat/conversations/${selectedConversationId}/messages/${messageId}/reactions`, { data: { emoji } });
                queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                    old.map(m => m.id === messageId ? { ...m, reactions: m.reactions?.filter(r => !(String(r.user_id) === String(user.id) && r.emoji === emoji)) } : m)
                );
            } else {
                await api.post(`/chat/conversations/${selectedConversationId}/messages/${messageId}/reactions`, { emoji });
                queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
                    old.map(m => m.id === messageId ? { ...m, reactions: [...(m.reactions || []), { user_id: user.id, emoji }] } : m)
                );
            }
        } catch (err) {
            console.error("Failed to toggle reaction", err);
        }
    };

    // -- Helper to get conversation name/image --
    const getConversationDetails = (conv: Conversation) => {
        if (!conv || !conv.type) {
            return { name: 'Unknown', image: null, initials: '?', participantId: null };
        }

        if (conv.type === 'DIRECT') {
            const other = conv.participants?.find(p => String(p.id) !== String(user?.id)) || conv.participants?.[0];
            const name = `${other?.first_name || ''} ${other?.last_name || ''}`.trim() || other?.email || 'Unknown';
            return {
                name,
                image: other?.profile_pic ? `${API_BASE_URL.replace('/api', '')}${other.profile_pic}` : null,
                initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                participantId: other?.id,
                status: other?.status // Pass status through
            };
        }
        return {
            name: conv.name || 'Group Chat',
            image: null,
            initials: (conv.name || 'G').slice(0, 2).toUpperCase(),
            participantId: null,
            status: undefined
        };
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-6rem)] bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl">

                {/* Sidebar */}
                <div className="w-[340px] border-r border-gray-200/80 dark:border-gray-800/80 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Status Selector - Teams Style */}
                            <div className="relative group/status">
                                <div className="relative h-9 w-9 cursor-pointer">
                                    {/* Avatar Base */}
                                    <div className="h-9 w-9 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                        <span className="text-xs font-bold text-primary">{user?.first_name?.[0]}</span>
                                    </div>

                                    {/* Status Dot Overlay - Teams Style */}
                                    <div className={cn(
                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center",
                                        userStatus === 'ONLINE' ? 'bg-emerald-500' :
                                            userStatus === 'AWAY' ? 'bg-amber-500' :
                                                userStatus === 'DND' ? 'bg-rose-500' :
                                                    userStatus === 'BUSY' ? 'bg-rose-500' : 'bg-gray-400'
                                    )} title={userStatus === 'BUSY' ? 'In a Meeting' : userStatus}>
                                        {userStatus === 'ONLINE' && <Check size={8} strokeWidth={4} className="text-white" />}
                                        {userStatus === 'AWAY' && <Clock size={8} strokeWidth={3} className="text-white" />}
                                        {userStatus === 'DND' && <Minus size={8} strokeWidth={4} className="text-white" />}
                                        {userStatus === 'BUSY' && <PhoneIncoming size={6} strokeWidth={3} className="text-white" />}
                                        {userStatus === 'OFFLINE' && <X size={8} strokeWidth={4} className="text-white" />}
                                    </div>
                                </div>
                                <div className="absolute top-8 left-0 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 hidden group-hover/status:block z-50">
                                    {(['ONLINE', 'AWAY', 'DND', 'BUSY', 'OFFLINE'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChange(s)}
                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                                        >
                                            <span className={cn(
                                                "h-2 w-2 rounded-full",
                                                s === 'ONLINE' ? 'bg-emerald-500' :
                                                    s === 'AWAY' ? 'bg-amber-500' :
                                                        s === 'DND' || s === 'BUSY' ? 'bg-rose-500' : 'bg-gray-400'
                                            )} />
                                            {s === 'BUSY' ? 'In a Meeting' : s}
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

                    <div className="px-4 py-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && searchQuery) {
                                        try {
                                            const res = await api.get(`/chat/search?q=${searchQuery}`);
                                            setSearchResults(res.data.data.users);
                                            setIsSelectingContact(true);
                                        } catch (err) { console.error(err); }
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isSelectingContact ? (
                            <div className="animate-in slide-in-from-right duration-200">
                                <div className="p-2">
                                    <button
                                        onClick={() => setIsSelectingContact(false)}
                                        className="w-full p-2 text-left text-sm text-primary hover:underline mb-2"
                                    >
                                        ← Back to conversations
                                    </button>
                                    {searchQuery && searchResults.length > 0 ? (
                                        // Show Search Results
                                        searchResults.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleStartDirectChat(user.id)}
                                                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                                            >
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                                    <Search size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </button>
                                        ))
                                    ) : isLoadingContacts ? (
                                        <div className="p-4 text-center text-gray-500">Loading contacts...</div>
                                    ) : contacts?.map(contact => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleStartDirectChat(contact.id)}
                                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                                        >
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                {contact.first_name?.charAt(0) || contact.email.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {contact.first_name ? `${contact.first_name} ${contact.last_name || ''}` : contact.email}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{contact.designation || contact.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoadingConversations ? (
                                    <div className="p-4 text-center text-gray-500">Loading chats...</div>
                                ) : conversations?.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <p className="mb-2">No conversations yet</p>
                                        <button
                                            onClick={() => setIsSelectingContact(true)}
                                            className="text-primary hover:underline text-sm"
                                        >
                                            Start a new chat
                                        </button>
                                    </div>
                                ) : (
                                    conversations?.map(conv => {
                                        const details = getConversationDetails(conv);
                                        const isActive = selectedConversationId === conv.id;
                                        return (
                                            <button
                                                key={conv.id}
                                                onClick={() => setSelectedConversationId(conv.id)}
                                                className={cn(
                                                    "w-full p-3 mx-2 my-0.5 flex items-center gap-3 rounded-xl transition-all duration-200 text-left relative group",
                                                    isActive
                                                        ? "bg-primary-10 dark:bg-primary-20 shadow-sm"
                                                        : "hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                                                )}
                                            >
                                                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-gradient rounded-full" />}

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
                                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center",
                                                        details.status === 'ONLINE' ? 'bg-emerald-500' :
                                                            details.status === 'AWAY' ? 'bg-amber-500' :
                                                                details.status === 'DND' ? 'bg-rose-500' :
                                                                    details.status === 'BUSY' ? 'bg-rose-500' : 'bg-gray-400'
                                                    )}>
                                                        {details.status === 'ONLINE' && <Check size={8} strokeWidth={4} className="text-white" />}
                                                        {details.status === 'AWAY' && <Clock size={8} strokeWidth={3} className="text-white" />}
                                                        {details.status === 'DND' && <Minus size={8} strokeWidth={4} className="text-white" />}
                                                        {details.status === 'BUSY' && <PhoneIncoming size={6} strokeWidth={3} className="text-white" />}
                                                        {(!details.status || details.status === 'OFFLINE') && <X size={8} strokeWidth={4} className="text-white" />}
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
                                    })
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gradient-to-br from-white via-gray-50/50 to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10">
                    {selectedConversationId ? (
                        <>
                            {/* Header */}
                            <div className="h-[72px] border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const conv = activeConversation || conversations?.find(c => String(c.id) === String(selectedConversationId));

                                        if (!conv) {
                                            return (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                    <div className="flex flex-col gap-1">
                                                        <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                                                        <div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const details = getConversationDetails(conv);
                                        return (
                                            <>
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                    {details.initials}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{details.name}</h3>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        {typingStatus[selectedConversationId || '']?.length > 0 ? (
                                                            <span className="text-primary font-medium italic animate-pulse">
                                                                {typingStatus[selectedConversationId!].join(', ')} {typingStatus[selectedConversationId!].length > 1 ? 'are' : 'is'} typing...
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className={cn(
                                                                    "h-2 w-2 rounded-full",
                                                                    details.status === 'ONLINE' ? 'bg-emerald-500' :
                                                                        details.status === 'AWAY' ? 'bg-amber-500' :
                                                                            details.status === 'DND' ? 'bg-rose-500' :
                                                                                details.status === 'BUSY' ? 'bg-rose-500' : 'bg-gray-400'
                                                                )}></span>
                                                                {details.status === 'BUSY' ? 'In a Meeting' : (details.status || 'Offline')}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-4 text-gray-400">
                                    {activeRoomCall === selectedConversationId && !activeCall && (
                                        <button
                                            onClick={() => joinActiveCall(selectedConversationId, 'video')}
                                            className="group relative flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all border border-emerald-500/20 active:scale-95"
                                            title="Meeting in progress - Click to Join"
                                        >
                                            <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </div>
                                            <Video size={18} className="animate-pulse" />
                                            <span className="text-[11px] font-black uppercase tracking-wider">Join ongoing call</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (activeCall) {
                                                toggleAudio();
                                                return;
                                            }
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) {
                                                    initiateCall(details.participantId, details.name, 'audio', selectedConversationId);
                                                } else if (conv.type === 'GROUP') {
                                                    initiateCall(conv.id, conv.name || 'Group', 'audio', conv.id, true);
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "hover:text-gray-600 dark:hover:text-gray-200 transition-colors",
                                            activeCall && !isMuted ? "text-emerald-500" : "text-gray-400"
                                        )}
                                        title={activeCall ? "Toggle Audio" : "Audio Call"}
                                    >
                                        {activeCall && isMuted ? <MicOff size={20} /> : <Phone size={20} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (activeCall) {
                                                toggleVideo();
                                                return;
                                            }
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) {
                                                    initiateCall(details.participantId, details.name, 'video', selectedConversationId);
                                                } else if (conv.type === 'GROUP') {
                                                    initiateCall(conv.id, conv.name || 'Group', 'video', conv.id, true);
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "hover:text-gray-600 dark:hover:text-gray-200 transition-colors",
                                            activeCall && !isVideoOff ? "text-primary" : "text-gray-400"
                                        )}
                                        title={activeCall ? "Toggle Video" : "Video Call"}
                                    >
                                        {activeCall && isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                                    </button>
                                    <button
                                        onClick={() => setShowPins(!showPins)}
                                        className={cn("hover:text-gray-600 dark:hover:text-gray-200", showPins && "text-primary")}
                                        title="Pinned Messages"
                                    >
                                        <Pin size={20} className={showPins ? "fill-primary" : ""} />
                                    </button>
                                    <button
                                        onClick={() => setShowMessageSearch(true)}
                                        className="hover:text-gray-600 dark:hover:text-gray-200"
                                        title="Search in conversation"
                                    >
                                        <Search size={20} />
                                    </button>
                                    <button className="hover:text-gray-600 dark:hover:text-gray-200"><MoreVertical size={20} /></button>
                                </div>
                            </div>

                            {/* Message Search Overlay */}
                            {showMessageSearch && (
                                <MessageSearch
                                    messages={messages || []}
                                    onResultSelect={(messageId) => {
                                        setHighlightedMessageId(messageId);
                                        // Scroll to message
                                        const element = document.getElementById(`message-${messageId}`);
                                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Remove highlight after animation
                                        setTimeout(() => setHighlightedMessageId(null), 2000);
                                    }}
                                    onClose={() => setShowMessageSearch(false)}
                                />
                            )}

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

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 relative">
                                {messages?.map((msg, index) => {
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
                                                    <div className="h-8 w-8 rounded-full bg-primary-gradient p-[1px] shadow-sm">
                                                        <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                            {msg.sender_profile_pic ? (
                                                                <img src={`${API_BASE_URL.replace('/api', '')}${msg.sender_profile_pic}`} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-primary">{msg.sender_first_name?.[0] || '?'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : <div className="w-8" />}
                                            </div>

                                            <div className={cn(
                                                "max-w-[75%] min-w-[60px] relative transition-all duration-200",
                                                isMe ? "items-end" : "items-start",
                                                msg.reactions && msg.reactions.length > 0 ? "mb-2" : "" // Add space for overlapping reactions
                                            )}>
                                                {!isMe && !isSameSender && (
                                                    <span className="text-[10px] font-semibold text-gray-500 ml-1 mb-1 block">
                                                        {msg.sender_first_name} {msg.sender_last_name}
                                                    </span>
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
                                                    "rounded-2xl px-4 py-3 shadow-sm group-hover:shadow-lg transition-all duration-300 relative",
                                                    isMe
                                                        ? "bg-primary-gradient text-white rounded-br-md"
                                                        : "bg-white dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-100/80 dark:border-gray-700/50 backdrop-blur-sm"
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
                                                            {msg.type === 'FILE' ? (
                                                                <a
                                                                    href={`${API_BASE_URL.replace('/api', '')}${msg.file_url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={cn(
                                                                        "flex items-center gap-4 p-3 rounded-xl transition-colors",
                                                                        isMe ? "bg-white/10 hover:bg-white/20" : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700"
                                                                    )}
                                                                >
                                                                    <div className={cn("p-2 rounded-lg", isMe ? "bg-white/20" : "bg-primary/10 text-primary")}>
                                                                        <Paperclip size={20} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-semibold truncate">{msg.content}</p>
                                                                        <p className="text-[10px] opacity-70">File Attachment</p>
                                                                    </div>
                                                                </a>
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
                                                                    "absolute -bottom-3 flex items-center bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 dark:border-gray-700 z-10",
                                                                    isMe ? "left-0 -translate-x-2" : "right-0 translate-x-2"
                                                                )}>
                                                                    {msg.reactions.map((reaction, i) => (
                                                                        <span key={i} className="text-[10px] px-0.5" title="Reaction">
                                                                            {reaction.emoji}
                                                                        </span>
                                                                    ))}
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
                                                        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 shadow-sm rounded-lg px-2 py-1 z-20 border border-gray-100 dark:border-gray-700",
                                                        isMe ? "-left-32" : "-right-28"
                                                    )}>
                                                        {/* Quick Reaction Picker */}
                                                        <div className="relative">
                                                            <button
                                                                className="p-1 hover:text-primary text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                                onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                                                title="React"
                                                            >
                                                                <Smile size={14} />
                                                            </button>
                                                            {showReactionPicker === msg.id && (
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                                    <div className="flex gap-1">
                                                                        {['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'].map(emoji => (
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
                                                        <button
                                                            className="p-1 hover:text-primary text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                            onClick={() => {
                                                                setReplyToMessage(msg);
                                                                fileInputRef.current?.focus();
                                                            }}
                                                            title="Reply"
                                                        >
                                                            <span className="text-sm leading-none">↩️</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleTogglePin(msg.id)}
                                                            className={cn("p-1 rounded", msg.is_pinned ? "text-primary bg-primary/10" : "text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700")}
                                                            title={msg.is_pinned ? "Unpin" : "Pin"}
                                                        >
                                                            <Pin size={14} className={msg.is_pinned ? "fill-primary" : ""} />
                                                        </button>

                                                        <button
                                                            onClick={() => setForwardingMessage(msg)}
                                                            className="p-1 hover:text-primary text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                            title="Forward"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>

                                                        {isMe && msg.type === 'TEXT' && (
                                                            <>
                                                                <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-600 mx-1"></div>
                                                                <button onClick={() => startEditing(msg)} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-500" title="Edit">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500" title="Delete">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Typing Indicator */}
                            {typingStatus[selectedConversationId || '']?.length > 0 && (
                                <TypingIndicator
                                    users={typingStatus[selectedConversationId!]}
                                    className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                                />
                            )}

                            {/* Input */}
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                {replyToMessage && (
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-2 border-l-4 border-primary">
                                        <div className="text-sm">
                                            <span className="font-bold text-primary mr-2">Replying to {replyToMessage.sender_first_name || 'User'}:</span>
                                            <span className="text-gray-500 truncate">{replyToMessage.content.substring(0, 50)}...</span>
                                        </div>
                                        <button onClick={() => setReplyToMessage(null)}><X size={14} /></button>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="relative flex items-end gap-4 max-w-4xl mx-auto">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    <div className="flex-1 flex items-center gap-2 bg-white/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/40 rounded-2xl px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-300 backdrop-blur-xl shadow-sm hover:shadow-md">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-all duration-200"
                                        >
                                            <Paperclip size={20} />
                                        </button>

                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={handleInputChange}
                                            placeholder="Type your message..."
                                            className="flex-1 bg-transparent !border-0 !outline-none focus:ring-0 text-sm py-3 px-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        />

                                        {/* Emoji Picker Button */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className="p-2.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all duration-200"
                                            >
                                                <Smile size={20} />
                                            </button>
                                            {showEmojiPicker && (
                                                <EmojiPicker
                                                    onSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                                                    onClose={() => setShowEmojiPicker(false)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!messageInput.trim()}
                                        className="h-[56px] w-[56px] flex items-center justify-center bg-primary-gradient text-white rounded-2xl hover:shadow-xl hover:shadow-primary/25 active:scale-95 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all duration-300 shadow-lg group"
                                    >
                                        <Send size={22} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                                    </button>
                                </form>
                            </div>
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
            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                contacts={contacts || []}
                isLoading={isLoadingContacts}
                onCreate={async (name, userIds) => {
                    try {
                        await api.post('/chat/groups', { name, participantIds: userIds });
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    } catch (e) {
                        console.error("Failed to create group", e);
                    }
                }}
            />
        </DashboardLayout>
    );
};

export default ChatPage;

