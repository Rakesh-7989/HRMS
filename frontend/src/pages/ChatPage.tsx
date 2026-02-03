import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import { format } from 'date-fns';
import { Send, Phone, Video, MoreVertical, Search, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';
import { API_BASE_URL } from '@/utils/constants';

interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    designation?: string;
    profile_pic?: string;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'TEXT' | 'FILE' | 'CALL';
    file_url?: string;
    conversation_id: string;
    sender_first_name?: string;
    sender_last_name?: string;
    sender_profile_pic?: string;
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

export const ChatPage = () => {
    const { user } = useAuth();
    const { socket, sendMessage, joinRoom, initiateCall, markAsRead } = useChat();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isSelectingContact, setIsSelectingContact] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    // Fetch Conversations
    const { data: conversations, isLoading: isLoadingConversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await api.get('/chat/conversations');
            return res.data.data as Conversation[];
        }
    });

    // Fetch Contacts
    const { data: contacts, isLoading: isLoadingContacts } = useQuery({
        queryKey: ['contacts'],
        queryFn: async () => {
            const res = await api.get('/chat/contacts');
            return res.data.data as (User & { designation?: string })[];
        },
        enabled: isSelectingContact
    });

    // Fetch Messages for selected conversation
    const { data: messages, isLoading: isLoadingMessages } = useQuery({
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
            const conversationId = res.data.data.id;

            // Refresh conversations and switch to the new/existing one
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setSelectedConversationId(conversationId);
            setIsSelectingContact(false);
        } catch (err) {
            console.error("Failed to start chat", err);
        }
    };

    // Join room and mark as read when conversation selected
    useEffect(() => {
        if (selectedConversationId) {
            joinRoom(selectedConversationId);
            markAsRead(selectedConversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    }, [selectedConversationId, joinRoom, markAsRead, queryClient]);

    // Listen for real-time messages
    useEffect(() => {
        if (socket) {
            socket.on('receive_message', (newMessage: Message) => {
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
            });

            socket.on('unread_update', () => {
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            });

            return () => {
                socket.off('receive_message');
                socket.off('unread_update');
            };
        }
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
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err) {
            console.error("Upload failed", err);
            // Optionally add toast here if you have a toast library
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConversationId) return;

        try {
            await api.post(`/chat/conversations/${selectedConversationId}/messages`, {
                content: messageInput,
                type: 'TEXT'
            });
            setMessageInput('');
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    // -- Helper to get conversation name/image --
    const getConversationDetails = (conv: Conversation) => {
        if (conv.type === 'DIRECT') {
            const other = conv.participants.find(p => p.id !== user?.id) || conv.participants[0];
            return {
                name: `${other?.first_name || ''} ${other?.last_name || ''}`.trim() || other?.email || 'Unknown',
                image: other?.profile_pic,
                participantId: other?.id
            };
        }
        return { name: conv.name || 'Group Chat', image: null, participantId: null };
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-800">

                {/* Sidebar */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Messages</h2>
                        <button
                            onClick={() => setIsSelectingContact(!isSelectingContact)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-primary transition-colors"
                            title="New Chat"
                        >
                            <MoreVertical className="h-5 w-5 rotate-90" />
                        </button>
                    </div>

                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
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
                                    {isLoadingContacts ? (
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
                                        return (
                                            <button
                                                key={conv.id}
                                                onClick={() => setSelectedConversationId(conv.id)}
                                                className={cn(
                                                    "w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-l-2",
                                                    selectedConversationId === conv.id ? "bg-gray-100 dark:bg-gray-800 border-primary" : "border-transparent"
                                                )}
                                            >
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                    {details.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="font-medium truncate text-gray-900 dark:text-gray-100">{details.name}</span>
                                                        {conv.last_message && (
                                                            <span className="text-xs text-gray-400">
                                                                {format(new Date(conv.last_message.created_at), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className="text-sm text-gray-500 truncate flex-1">
                                                            {(() => {
                                                                if (!conv.last_message) return 'No messages';
                                                                if (conv.last_message.type === 'CALL') return '📞 Call History';
                                                                if (conv.last_message.type === 'FILE') return '📁 Attachment';
                                                                return conv.last_message.content;
                                                            })()}
                                                        </p>
                                                        {conv.unread_count > 0 && (
                                                            <span className="bg-gradient-to-tr from-red-600 to-rose-400 text-white text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-sm ml-2">
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
                <div className="flex-1 flex flex-col">
                    {selectedConversationId ? (
                        <>
                            {/* Header */}
                            <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                        {(() => {
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            return conv ? getConversationDetails(conv).name.charAt(0) : '#';
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {(() => {
                                                const conv = conversations?.find(c => c.id === selectedConversationId);
                                                return conv ? getConversationDetails(conv).name : 'Chat';
                                            })()}
                                        </h3>
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-green-500"></span> Online
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-gray-400">
                                    <button
                                        onClick={() => {
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) initiateCall(details.participantId, details.name, 'audio', selectedConversationId);
                                            }
                                        }}
                                        className="hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <Phone size={20} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const conv = conversations?.find(c => c.id === selectedConversationId);
                                            if (conv) {
                                                const details = getConversationDetails(conv);
                                                if (details.participantId) initiateCall(details.participantId, details.name, 'video', selectedConversationId);
                                            }
                                        }}
                                        className="hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <Video size={20} />
                                    </button>
                                    <button className="hover:text-gray-600 dark:hover:text-gray-200"><MoreVertical size={20} /></button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                                {messages?.map(msg => {
                                    const isMe = msg.sender_id === user?.id;
                                    if (msg.type === 'CALL') {
                                        let callData = { callType: 'audio', duration: 0, status: 'ended' };
                                        try { callData = JSON.parse(msg.content); } catch (e) { }
                                        return (
                                            <div key={msg.id} className="flex justify-center my-4">
                                                <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 text-xs text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                                                    {callData.callType === 'video' ? <Video size={12} /> : <Phone size={12} />}
                                                    <span>
                                                        {callData.status === 'missed' ? 'Missed call' : `Call ended (${Math.floor(callData.duration / 60)}:${(callData.duration % 60).toString().padStart(2, '0')})`}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id} className={cn("flex gap-3", isMe ? "justify-end" : "justify-start")}>
                                            {!isMe && (
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
                                                    {msg.sender_profile_pic ? (
                                                        <img src={`${API_BASE_URL.replace('/api', '')}${msg.sender_profile_pic}`} className="w-full h-full object-cover" />
                                                    ) : (msg.sender_first_name?.[0] || '?')}
                                                </div>
                                            )}
                                            <div className={cn(
                                                "max-w-[70%] rounded-2xl px-4 py-2",
                                                isMe
                                                    ? "bg-primary text-white rounded-br-none"
                                                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none shadow-sm"
                                            )}>
                                                {msg.type === 'FILE' ? (
                                                    <a
                                                        href={`${API_BASE_URL.replace('/api', '')}${msg.file_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors"
                                                    >
                                                        <Paperclip size={20} className={isMe ? "text-white/80" : "text-primary"} />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{msg.content}</p>
                                                            <p className="text-[10px] opacity-60">File Attachment</p>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <p>{msg.content}</p>
                                                )}
                                                <p className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-white" : "text-gray-400")}>
                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <Paperclip size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-lg focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageInput.trim()}
                                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Send size={32} />
                            </div>
                            <p>Select a conversation to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;
