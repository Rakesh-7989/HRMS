import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/utils/cn';

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ar', name: 'العربية', flag: '🇦🇪' },
];

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLanguage = languages.find(lang => lang.code === (i18n.language?.split('-')[0] || 'en')) || languages[0];

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);

        // Update direction for Arabic
        document.dir = code === 'ar' ? 'rtl' : 'ltr';
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={t('common.changeLanguage')}
            >
                <span className="text-lg">{currentLanguage.flag}</span>
                <span className="text-xs font-bold uppercase hidden md:inline-block">{currentLanguage.code}</span>
                <Languages size={16} className="text-gray-500" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-1.5 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('common.selectLanguage')}</span>
                    </div>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                                i18n.language?.startsWith(lang.code) ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" : "text-gray-700 dark:text-gray-300"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{lang.flag}</span>
                                <span>{lang.name}</span>
                            </div>
                            {i18n.language?.startsWith(lang.code) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
