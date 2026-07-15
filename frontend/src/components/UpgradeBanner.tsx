import React from 'react';
import { Button } from '@/components/ui/Button';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

interface UpgradeBannerProps {
    planName: string;
    message?: string;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
    planName,
    message = "Unlock this feature and take your HR management to the next level."
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const handleUpgrade = () => {
        if (isAdmin) {
            navigate(ROUTES.PRICING);
        }
    };

    return (
        <div className="bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-500/20 rounded-lg text-brand-500">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Available on <span className="text-brand-500 italic">{planName}</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                        {message}
                    </p>
                </div>
            </div>

            {isAdmin ? (
                <Button
                    size="lg"
                    onClick={handleUpgrade}
                    className="shadow-elev-4 shadow-brand-500/25 whitespace-nowrap"
                >
                    Upgrade Now
                </Button>
            ) : (
                <div className="flex flex-col items-end gap-1">
                    <Button
                        size="lg"
                        disabled
                        className="bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed whitespace-nowrap"
                    >
                        Contact Your Admin
                    </Button>
                    <p className="text-[10px] text-gray-500 font-medium italic flex items-center gap-1">
                        <ShieldAlert size={10} />
                        You don't have admin permissions to upgrade
                    </p>
                </div>
            )}
        </div>
    );
};
