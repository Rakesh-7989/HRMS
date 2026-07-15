import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Search, X, Paperclip, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

interface Message {
    id: string;
    type?: string;
    content?: string;
    file_url?: string;
    sender_first_name?: string;
    sender_last_name?: string;
    created_at?: string;
}

interface MessageSearchProps {
    messages: Message[];
    onResultSelect: (messageId: string) => void;
    onClose: () => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onResultSelect, onClose }) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<Message[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [hasAttachmentFilter, setHasAttachmentFilter] = useState(false);

    // Use ref for callback to avoid infinite re-render loop
    const onResultSelectRef = React.useRef(onResultSelect);
    onResultSelectRef.current = onResultSelect;

    const performSearch = useCallback(() => {
        if (!searchText.trim() && !hasAttachmentFilter) {
            setResults([]);
            setCurrentIndex(-1);
            return;
        }

        let matches = [...messages];

        // Filter by attachment if toggled
        if (hasAttachmentFilter) {
            matches = matches.filter(msg =>
                msg.type === 'FILE' || msg.type === 'IMAGE' || msg.file_url
            );
        }

        // Filter by text if any
        if (searchText.trim()) {
            matches = matches.filter(msg =>
                msg.content?.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        setResults(matches);
        setCurrentIndex(matches.length > 0 ? 0 : -1);

        if (matches.length > 0) {
            onResultSelectRef.current(matches[0].id);
        }
    }, [searchText, hasAttachmentFilter, messages]);

    useEffect(() => {
        const debounce = setTimeout(performSearch, 300);
        return () => clearTimeout(debounce);
    }, [performSearch]);

    const goToNext = () => {
        if (results.length === 0) return;
        const nextIndex = (currentIndex + 1) % results.length;
        setCurrentIndex(nextIndex);
        onResultSelect(results[nextIndex].id);
    };

    const goPrevious = () => {
        if (results.length === 0) return;
        const prevIndex = (currentIndex - 1 + results.length) % results.length;
        setCurrentIndex(prevIndex);
        onResultSelect(results[prevIndex].id);
    };

    const highlightMatch = (text: string) => {
        if (!searchText.trim() || !text) return text;
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            part.toLowerCase() === searchText.toLowerCase()
                ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/40 text-inherit rounded-sm px-0.5">{part}</mark>
                : part
        );
    };

    const hasSearched = searchText.trim().length > 0 || hasAttachmentFilter;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 w-[340px] min-w-[340px] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Find in chat</h2>
                 <Button variant="ghost" 
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    <X size={18} />
                </Button>
            </div>

            {/* Search input */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Enter a search keyword..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); goToNext(); }
                            if (e.key === 'ArrowUp') { e.preventDefault(); goPrevious(); }
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Filter chips */}
            <div className="px-4 pb-3 flex items-center gap-2">
                 <Button variant="ghost" 
                    onClick={() => setHasAttachmentFilter(!hasAttachmentFilter)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        hasAttachmentFilter
                            ? "bg-brand-500/10 border-brand-500/30 text-brand-500"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                >
                    <Paperclip size={12} />
                    Has attachment
                </Button>
            </div>

            {/* Results area */}
            <div className="flex-1 overflow-y-auto">
                {!hasSearched ? (
                    // Empty state — Teams-style illustration placeholder
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        {/* Decorative search illustration */}
                        <div className="relative mb-6">
                            {/* Magnifying glass illustration */}
                            <div className="w-28 h-28 relative">
                                {/* Glass body */}
                                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 opacity-20" />
                                <div className="absolute inset-3 rounded-full border-[6px] border-blue-500/70" />
                                {/* Inner dots */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-orange-400" />
                                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                </div>
                                {/* Handle */}
                                <div className="absolute bottom-0 right-0 w-7 h-3 bg-blue-500/70 rounded-full transform rotate-45 origin-top-left translate-x-1 translate-y-2" />
                            </div>
                        </div>
                        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Search in this chat
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[220px]">
                            Find messages and links shared in this chat.
                        </p>
                    </div>
                ) : results.length === 0 ? (
                    // No results
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <Search size={24} className="text-gray-400" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            No results found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Try different keywords or remove filters.
                        </p>
                    </div>
                ) : (
                    // Results list
                    <div className="px-2">
                        {/* Navigation header */}
                        <div className="flex items-center justify-between px-3 py-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {results.length} result{results.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1">
                                 <Button variant="ghost" 
                                    onClick={goPrevious}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-500"
                                    title="Previous result"
                                >
                                    <ArrowUp size={14} />
                                </Button>
                                <span className="text-xs text-gray-400 min-w-[32px] text-center">
                                    {currentIndex + 1}/{results.length}
                                </span>
                                 <Button variant="ghost" 
                                    onClick={goToNext}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-500"
                                    title="Next result"
                                >
                                    <ArrowDown size={14} />
                                </Button>
                            </div>
                        </div>

                        {/* Result cards */}
                        {results.map((msg, index) => (
                             <Button variant="ghost" 
                                key={msg.id}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    onResultSelect(msg.id);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-3 rounded-lg mb-1 transition-colors group",
                                    currentIndex === index
                                        ? "bg-brand-500/8 dark:bg-brand-500/15 border border-brand-500/20"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                                )}
                            >
                                <div className="flex items-start gap-2.5">
                                    {/* Avatar */}
                                    <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-semibold text-[10px] flex-shrink-0 mt-0.5">
                                        {msg.sender_first_name?.[0]}{msg.sender_last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {msg.sender_first_name} {msg.sender_last_name}
                                            </span>
                                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                                                {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                                            </span>
                                        </div>
                                        {/* Message preview */}
                                        <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                                            {msg.type === 'FILE' || msg.type === 'IMAGE' ? (
                                                <span className="flex items-center gap-1">
                                                    <Paperclip size={11} className="flex-shrink-0" />
                                                    <span className="truncate">{highlightMatch(msg.content || 'Attachment')}</span>
                                                </span>
                                            ) : (
                                                highlightMatch(msg.content || '')
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageSearch;
