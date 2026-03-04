import React from 'react';
import { Button } from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';

interface UpgradeBannerProps {
    planName: string;
    message?: string;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
    planName,
    message = "Unlock this feature and take your HR management to the next level."
}) => {
    return (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg text-primary">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Available on <span className="text-primary italic">{planName}</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                        {message}
                    </p>
                </div>
            </div>
            <Button size="lg" className="shadow-lg shadow-primary/25 whitespace-nowrap">
                Upgrade Now
            </Button>
        </div>
    );
};
