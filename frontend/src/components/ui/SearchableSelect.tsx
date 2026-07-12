import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectOption {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    id?: string;
    disabled?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    name,
    id,
    disabled = false,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filtered = search
        ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const item = listRef.current.children[highlightedIndex] as HTMLElement;
        if (item) {
            item.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex, isOpen]);

    // Reset highlight when search changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [search]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filtered[highlightedIndex]) {
                    onChange(filtered[highlightedIndex].value);
                    setIsOpen(false);
                    setSearch('');
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearch('');
                break;
        }
    }, [isOpen, filtered, highlightedIndex, onChange]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden native input for form compatibility */}
            <input type="hidden" name={name} value={value} />

            {/* Trigger button */}
             <Button variant="ghost" 
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                onKeyDown={handleKeyDown}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all duration-200 shadow-elev-1 ${disabled
                        ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                        : isOpen
                            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-gray-800/50'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                    } text-gray-900 dark:text-white`}
            >
                <span className={selectedOption ? '' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-elev-5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <Search size={14} className="text-gray-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type to search..."
                            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                        />
                        {search && (
                             <Button variant="ghost" 
                                type="button"
                                onClick={() => setSearch('')}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X size={14} />
                            </Button>
                        )}
                    </div>

                    {/* Options list */}
                    <ul
                        ref={listRef}
                        className="max-h-60 overflow-y-auto py-1"
                        role="listbox"
                    >
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">
                                No results found
                            </li>
                        ) : (
                            filtered.map((option, idx) => (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={option.value === value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${idx === highlightedIndex
                                            ? 'bg-brand-500/10 text-brand-500 dark:bg-brand-500/20'
                                            : option.value === value
                                                ? 'bg-gray-50 dark:bg-gray-700/50 font-medium text-gray-900 dark:text-white'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {option.label}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
