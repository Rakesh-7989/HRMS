import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { projectsService } from '@/services/projects.service';
import { TaskComment, MentionableUser } from '@/types/project.types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Send, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';

interface TaskCommentsProps {
    taskId: string;
    projectId: string;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, projectId }) => {
    const confirm = useConfirm();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const mentionsRef = useRef<HTMLDivElement>(null);

    // Fetch comments
    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['task-comments', taskId],
        queryFn: () => projectsService.listComments(taskId),
        enabled: !!taskId,
    });

    // Fetch mentionable users
    const { data: mentionableUsers = [] } = useQuery({
        queryKey: ['mentionable-users', projectId],
        queryFn: () => projectsService.getMentionableUsers(projectId),
        enabled: !!projectId,
    });

    // Create comment mutation
    const createMutation = useMutation({
        mutationFn: (data: { content: string; mentions: string[] }) =>
            projectsService.createComment(taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            setNewComment('');
        },
    });

    // Update comment mutation
    const updateMutation = useMutation({
        mutationFn: ({ commentId, data }: { commentId: string; data: { content: string; mentions: string[] } }) =>
            projectsService.updateComment(commentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            setEditingId(null);
            setEditContent('');
        },
    });

    // Delete comment mutation
    const deleteMutation = useMutation({
        mutationFn: (commentId: string) => projectsService.deleteComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        },
    });

    // Extract @mentions from text
    const extractMentions = useCallback((text: string): string[] => {
        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex) || [];
        const mentionNames = matches.map(m => m.slice(1).toLowerCase());

        return mentionableUsers
            .filter(u => mentionNames.includes(u.first_name.toLowerCase()) ||
                mentionNames.includes(u.display_name.toLowerCase().replace(/\s/g, '')))
            .map(u => u.id);
    }, [mentionableUsers]);

    // Handle input change with @mention detection
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>, isEdit = false) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;

        if (isEdit) {
            setEditContent(value);
        } else {
            setNewComment(value);
        }
        setCursorPosition(cursorPos);

        // Check for @ trigger
        const textBeforeCursor = value.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            // Only show if no space after @
            if (!textAfterAt.includes(' ')) {
                setMentionSearch(textAfterAt.toLowerCase());
                setShowMentions(true);
                return;
            }
        }
        setShowMentions(false);
    };

    // Filter mentionable users based on search (excluding current user)
    const filteredUsers = mentionableUsers
        .filter(u => u.id !== user?.id) // Exclude current user
        .filter(u =>
            u.display_name.toLowerCase().includes(mentionSearch) ||
            u.first_name.toLowerCase().includes(mentionSearch) ||
            u.email.toLowerCase().includes(mentionSearch)
        );

    // Insert mention into text
    const insertMention = (mentionUser: MentionableUser, isEdit = false) => {
        const text = isEdit ? editContent : newComment;
        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = text.slice(cursorPosition);

        const newText = textBeforeCursor.slice(0, lastAtIndex) +
            `@${mentionUser.first_name}${mentionUser.last_name} ` +
            textAfterCursor;

        if (isEdit) {
            setEditContent(newText);
        } else {
            setNewComment(newText);
        }
        setShowMentions(false);

        // Focus back on textarea
        if (isEdit) {
            editTextareaRef.current?.focus();
        } else {
            textareaRef.current?.focus();
        }
    };

    // Submit new comment
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const mentions = extractMentions(newComment);
        createMutation.mutate({ content: newComment.trim(), mentions });
    };

    // Submit edited comment
    const handleEditSubmit = (commentId: string) => {
        if (!editContent.trim()) return;

        const mentions = extractMentions(editContent);
        updateMutation.mutate({ commentId, data: { content: editContent.trim(), mentions } });
    };

    // Render comment content with highlighted mentions
    const renderCommentContent = (content: string) => {
        const mentionRegex = /@(\w+)/g;
        const parts = content.split(mentionRegex);

        return parts.map((part, i) => {
            // Odd indices are the captured groups (names after @)
            if (i % 2 === 1) {
                return (
                    <span key={i} className="text-brand-400 dark:text-brand-300 font-medium">
                        @{part}
                    </span>
                );
            }
            return part;
        });
    };

    // Check if user can edit/delete a comment
    const canModifyComment = (comment: TaskComment) => {
        if (!user) return false;
        return comment.user_id === user.id || user.role === 'ADMIN';
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
                setShowMentions(false);
            }
            setActiveDropdownId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <MessageSquare className="h-4 w-4" />
                <span>Comments ({comments.length})</span>
            </div>

            {/* Comments List */}
            <div className="space-y-3 pr-1">
                {isLoading ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        No comments yet. Be the first to comment!
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-100 dark:border-gray-700"
                        >
                            {/* Comment Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-brand-600 flex items-center justify-center text-[10px] text-white font-bold">
                                        {(comment.user.first_name || '').charAt(0)}{(comment.user.last_name || '').charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {comment.user.first_name} {comment.user.last_name}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                        {comment.updated_at !== comment.created_at && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(edited)</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Menu */}
                                {canModifyComment(comment) && (
                                    <div className="relative">
                                         <Button variant="ghost" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdownId(activeDropdownId === comment.id ? null : comment.id);
                                            }}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        </Button>

                                        {activeDropdownId === comment.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-elev-4 z-50 min-w-[120px]">
                                                 <Button variant="ghost" 
                                                    onClick={() => {
                                                        setEditingId(comment.id);
                                                        setEditContent(comment.content);
                                                        setActiveDropdownId(null);
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    Edit
                                                </Button>
                                                 <Button variant="ghost" 
                                                    onClick={async () => {
                                                        if (await confirm({ type: 'destructive', title: 'Delete Comment', message: 'Delete this comment?' })) {
                                                            deleteMutation.mutate(comment.id);
                                                        }
                                                        setActiveDropdownId(null);
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Delete
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Comment Content */}
                            {editingId === comment.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        ref={editTextareaRef}
                                        value={editContent}
                                        onChange={(e) => handleInputChange(e, true)}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-brand-500"
                                        rows={2}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleEditSubmit(comment.id)}
                                            disabled={updateMutation.isPending}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingId(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-9">
                                    {renderCommentContent(comment.content)}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative" ref={mentionsRef}>
                    <textarea
                        ref={textareaRef}
                        value={newComment}
                        onChange={(e) => handleInputChange(e)}
                        placeholder="Write a comment... Use @ to mention someone"
                        className="w-full p-3 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-brand-500"
                        rows={2}
                    />
                     <Button variant="ghost" 
                        type="submit"
                        disabled={!newComment.trim() || createMutation.isPending}
                        className="absolute right-2 bottom-2 p-2 text-brand-500 dark:text-brand-400 hover:bg-brand-500/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </Button>

                    {/* Mentions Dropdown */}
                    {showMentions && filteredUsers.length > 0 && (
                        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-elev-5 z-[100] max-h-[180px] overflow-y-auto">
                            <div className="p-1">
                                {filteredUsers.map((mentionUser) => (
                                     <Button variant="ghost" 
                                        key={mentionUser.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            insertMention(mentionUser);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-left transition-colors"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-brand-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                                            {(mentionUser.first_name || '').charAt(0)}{(mentionUser.last_name || '').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {mentionUser.display_name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {mentionUser.email}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
