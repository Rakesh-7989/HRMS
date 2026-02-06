import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';

interface MessageSearchProps {
    messages: any[];
    onResultSelect: (messageId: string) => void;
    onClose: () => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onResultSelect, onClose }) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const performSearch = useCallback(() => {
        if (!searchText.trim()) {
            setResults([]);
            return;
        }

        const matches = messages.filter(msg =>
            msg.content?.toLowerCase().includes(searchText.toLowerCase())
        );
        setResults(matches);
        setCurrentIndex(0);

        if (matches.length > 0) {
            onResultSelect(matches[0].id);
        }
    }, [searchText, messages, onResultSelect]);

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

    return (
        <div className="absolute top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3 p-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search in conversation..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') goToNext();
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                </div>

                {results.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">
                            {currentIndex + 1} of {results.length}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={goPrevious}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                <ArrowUp size={16} />
                            </button>
                            <button
                                onClick={goToNext}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                <ArrowDown size={16} />
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500"
                >
                    <X size={18} />
                </button>
            </div>

            {searchText && results.length === 0 && (
                <div className="px-4 pb-3 text-xs text-gray-400">
                    No messages found for "{searchText}"
                </div>
            )}
        </div>
    );
};

export default MessageSearch;
