import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

interface EmojiData {
    char: string;
    tags: string;
}

const EMOJI_CATEGORIES: Record<string, EmojiData[]> = {
    'Smileys': [
        { char: '😀', tags: 'grinning face happy smiley' },
        { char: '😃', tags: 'grinning face big eyes happy' },
        { char: '😄', tags: 'grinning face smiling eyes happy' },
        { char: '😁', tags: 'beaming face smiling eyes happy grin' },
        { char: '😆', tags: 'grinning squinting face haha' },
        { char: '😅', tags: 'grinning face sweat cold sweat' },
        { char: '🤣', tags: 'rofl rolling on floor laughing' },
        { char: '😂', tags: 'joy face with tears of joy' },
        { char: '🙂', tags: 'slightly smiling face' },
        { char: '🙃', tags: 'upside down face' },
        { char: '😉', tags: 'winking face wink' },
        { char: '😊', tags: 'smiling face with smiling eyes blush' },
        { char: '😇', tags: 'smiling face with halo innocent' },
        { char: '🥰', tags: 'smiling face with hearts love' },
        { char: '😍', tags: 'heart eyes smiling face with heart-eyes' },
        { char: '🤩', tags: 'star struck grin' },
        { char: '😘', tags: 'face blowing a kiss' },
        { char: '😗', tags: 'kissing face' },
        { char: '😚', tags: 'kissing face with closed eyes' },
        { char: '😙', tags: 'kissing face with smiling eyes' },
        { char: '😋', tags: 'face savoring food yum' },
        { char: '😛', tags: 'face with tongue' },
        { char: '😜', tags: 'winking face with tongue' },
        { char: '🤪', tags: 'zany face crazy' },
        { char: '😝', tags: 'squinting face with tongue' },
        { char: '🤑', tags: 'money mouth face' },
        { char: '🤗', tags: 'hugging face hugs' },
        { char: '🤭', tags: 'face with hand over mouth' },
        { char: '🤫', tags: 'shushing face quiet' },
        { char: '🤔', tags: 'thinking face hmm' },
        { char: '🤐', tags: 'zipper mouth face' },
        { char: '🤨', tags: 'face with raised eyebrow' },
        { char: '😐', tags: 'neutral face' },
        { char: '😑', tags: 'expressionless face' },
        { char: '😶', tags: 'face without mouth' },
        { char: '😏', tags: 'smirking face smirk' },
        { char: '😒', tags: 'unamused face' },
        { char: '🙄', tags: 'face with rolling eyes roll' },
        { char: '😬', tags: 'grimacing face' },
        { char: '🤥', tags: 'lying face nose' },
        { char: '😌', tags: 'relieved face' },
        { char: '😔', tags: 'pensive face' },
        { char: '😪', tags: 'sleepy face' },
        { char: '🤤', tags: 'drooling face' },
        { char: '😴', tags: 'sleeping face zzz' },
        { char: '😷', tags: 'face with medical mask' },
        { char: '🤒', tags: 'face with thermometer' },
        { char: '🤕', tags: 'face with head-bandage' },
        { char: '🤢', tags: 'nauseated face green' },
        { char: '🤮', tags: 'face vomiting puke' },
        { char: '🤧', tags: 'sneezing face' },
        { char: '🥵', tags: 'hot face red' },
        { char: '🥶', tags: 'cold face blue' },
        { char: '🥴', tags: 'woozy face dizzy' },
        { char: '😵', tags: 'dizzy face' },
        { char: '🤯', tags: 'exploding head mind blown' },
        { char: '🤠', tags: 'cowboy hat face' },
        { char: '🥳', tags: 'partying face celebrate' },
        { char: '🥸', tags: 'disguised face' },
        { char: '😎', tags: 'smiling face with sunglasses cool' },
        { char: '🤓', tags: 'nerd face' },
        { char: '🧐', tags: 'face with monocle' }
    ],
    'Gestures': [
        { char: '👋', tags: 'waving hand wave hi hello' },
        { char: '🤚', tags: 'raised back of hand' },
        { char: '🖐️', tags: 'hand with fingers splayed' },
        { char: '✋', tags: 'raised hand stop' },
        { char: '🖖', tags: 'vulcan salute' },
        { char: '👌', tags: 'ok hand' },
        { char: '🤌', tags: 'pinched fingers' },
        { char: '🤏', tags: 'pinching hand' },
        { char: '✌️', tags: 'victory hand peace' },
        { char: '🤞', tags: 'fingers crossed luck' },
        { char: '🤟', tags: 'love you gesture' },
        { char: '🤘', tags: 'sign of the horns rock' },
        { char: '🤙', tags: 'call me hand' },
        { char: '👈', tags: 'backhand index pointing left' },
        { char: '👉', tags: 'backhand index pointing right' },
        { char: '👆', tags: 'backhand index pointing up' },
        { char: '🖕', tags: 'middle finger' },
        { char: '👇', tags: 'backhand index pointing down' },
        { char: '☝️', tags: 'index pointing up' },
        { char: '👍', tags: 'thumbs up ok' },
        { char: '👎', tags: 'thumbs down no' },
        { char: '✊', tags: 'raised fist' },
        { char: '👊', tags: 'oncoming fist punch' },
        { char: '🤛', tags: 'left-facing fist' },
        { char: '🤜', tags: 'right-facing fist' },
        { char: '👏', tags: 'clapping hands' },
        { char: '🙌', tags: 'raising hands celebrate' },
        { char: '👐', tags: 'open hands' },
        { char: '🤲', tags: 'palms up together prayer' },
        { char: '🤝', tags: 'handshake' },
        { char: '🙏', tags: 'folded hands pray please thanks' },
        { char: '✍️', tags: 'writing hand' },
        { char: '💪', tags: 'flexed biceps strong' },
        { char: '🦾', tags: 'mechanical arm' },
        { char: '🦿', tags: 'mechanical leg' },
        { char: '🦵', tags: 'leg' },
        { char: '🦶', tags: 'foot' },
        { char: '👂', tags: 'ear' },
        { char: '🦻', tags: 'ear with hearing aid' },
        { char: '👃', tags: 'nose' },
        { char: '🧠', tags: 'brain' },
        { char: '🫀', tags: 'anatomical heart' },
        { char: '🫁', tags: 'lungs' },
        { char: '🦷', tags: 'tooth' },
        { char: '👀', tags: 'eyes' }
    ],
    'Hearts': [
        { char: '❤️', tags: 'red heart love' },
        { char: '🔥', tags: 'fire flame lit hot' },
        { char: '✨', tags: 'sparkles shiny' },
        { char: '🧡', tags: 'orange heart' },
        { char: '💛', tags: 'yellow heart' },
        { char: '💚', tags: 'green heart' },
        { char: '💙', tags: 'blue heart' },
        { char: '💜', tags: 'purple heart' },
        { char: '🖤', tags: 'black heart' },
        { char: '🤍', tags: 'white heart' },
        { char: '🤎', tags: 'brown heart' },
        { char: '💔', tags: 'broken heart' },
        { char: '💕', tags: 'two hearts' },
        { char: '💞', tags: 'revolving hearts' },
        { char: '💓', tags: 'beating heart' },
        { char: '💗', tags: 'growing heart' },
        { char: '💖', tags: 'sparkling heart' },
        { char: '💘', tags: 'heart with arrow' },
        { char: '💝', tags: 'heart with ribbon' },
        { char: '💟', tags: 'heart decoration' }
    ],
    'Objects': [
        { char: '💻', tags: 'laptop computer tech' },
        { char: '📱', tags: 'mobile phone' },
        { char: '🚀', tags: 'rocket ship blast off' },
        { char: '💡', tags: 'light bulb idea' },
        { char: '💼', tags: 'briefcase work office' },
        { char: '📁', tags: 'file folder' },
        { char: '📂', tags: 'open file folder' },
        { char: '📅', tags: 'calendar' },
        { char: '📆', tags: 'tear-off calendar' },
        { char: '📈', tags: 'chart increasing' },
        { char: '📉', tags: 'chart decreasing' },
        { char: '📊', tags: 'bar chart' },
        { char: '📋', tags: 'clipboard' },
        { char: '📌', tags: 'pushpin' },
        { char: '📍', tags: 'round pushpin map' },
        { char: '📎', tags: 'paperclip' },
        { char: '📏', tags: 'straight ruler' },
        { char: '📐', tags: 'triangular ruler' },
        { char: '✂️', tags: 'scissors' },
        { char: '🗑️', tags: 'wastebasket trash' },
        { char: '🔒', tags: 'locked' },
        { char: '🔓', tags: 'unlocked' },
        { char: '🔑', tags: 'key' },
        { char: '🔨', tags: 'hammer tool' },
        { char: '🔧', tags: 'wrench' },
        { char: '⚙️', tags: 'gear settings' },
        { char: '🔗', tags: 'link' },
        { char: '⛓️', tags: 'chains' },
        { char: '🧰', tags: 'toolbox' }
    ],
    'Symbols': [
        { char: '✅', tags: 'check mark button ok' },
        { char: '❌', tags: 'cross mark x no' },
        { char: '❓', tags: 'question mark' },
        { char: '❗', tags: 'exclamation mark' },
        { char: '💯', tags: 'hundred points' },
        { char: '🔴', tags: 'red circle' },
        { char: '🟢', tags: 'green circle' },
        { char: '🔵', tags: 'blue circle' },
        { char: '⭐', tags: 'star' },
        { char: '🌟', tags: 'glowing star' },
        { char: '✨', tags: 'sparkles' },
        { char: '⚡', tags: 'high voltage lightning' },
        { char: '💥', tags: 'collision explosion' },
        { char: '🛑', tags: 'stop sign' },
        { char: '⚠️', tags: 'warning' },
        { char: '🚫', tags: 'prohibited' },
        { char: '🔔', tags: 'bell notification' },
        { char: '🔕', tags: 'bell with slash silent' }
    ]
};

export const EmojiPicker: React.FC<EmojiPickerProps & { className?: string }> = ({ onSelect, onClose, className }) => {
    const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEmojis = searchQuery
        ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.tags.toLowerCase().includes(searchQuery.toLowerCase()))
        : EMOJI_CATEGORIES[activeCategory];

    return (
        <div className={cn("absolute bottom-full mb-2 left-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200", className)}>
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
                            key={`${emoji.char}-${index}`}
                            onClick={() => {
                                onSelect(emoji.char);
                                onClose();
                            }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hover:scale-110"
                        >
                            {emoji.char}
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
