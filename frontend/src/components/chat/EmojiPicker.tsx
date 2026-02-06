import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

const EMOJI_CATEGORIES = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
    'Objects': ['💼', '📁', '📂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '💣', '🪃', '🏹', '🛡️', '🔧', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜'],
    'Symbols': ['✅', '❌', '❓', '❗', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '💠', '🔘', '🔳', '🔲', '⭕', '✔️', '✖️', '➕', '➖', '➗', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '‼️', '⁉️', '〰️', '©️', '®️', '™️'],
    'Work': ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🔌', '📡', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️']
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
    const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEmojis = searchQuery
        ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.includes(searchQuery))
        : EMOJI_CATEGORIES[activeCategory];

    return (
        <div className="absolute bottom-full mb-2 left-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search emojis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Category Tabs */}
            {!searchQuery && (
                <div className="flex gap-1 p-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto scrollbar-hide">
                    {Object.keys(EMOJI_CATEGORIES).map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                                activeCategory === category
                                    ? "bg-primary-gradient text-white shadow-md shadow-primary/20 scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Grid */}
            <div className="p-3 h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            onClick={() => {
                                onSelect(emoji);
                                onClose();
                            }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hover:scale-110"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                {filteredEmojis.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No emojis found
                    </div>
                )}
            </div>

            {/* Quick Reactions */}
            <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Quick Reactions</span>
                    <div className="flex gap-1">
                        {['👍', '❤️', '😂', '😮', '😢', '👏'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onSelect(emoji);
                                    onClose();
                                }}
                                className="w-7 h-7 flex items-center justify-center text-lg hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors hover:scale-125"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmojiPicker;
