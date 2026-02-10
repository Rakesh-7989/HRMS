import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CurrentBreaksContent } from '@/components/attendance/CurrentBreaksContent';
import { BreakHistoryContent } from '@/components/attendance/BreakHistoryContent';
import { useAuth } from '@/contexts/AuthContext';

type SubTab = 'current-breaks' | 'break-history';

export const UnifiedBreaksContent: React.FC = () => {
    const { user } = useAuth();
    // Default to 'break-history' for employees, 'current-breaks' for managers if they prefer?
    // Actually, 'Break History' is available to all. 'On Break' is limited.
    // Let's default to 'break-history' as it's safe for everyone, or check role.

    const canSeeCurrentBreaks = ['MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

    const [activeSubTab, setActiveSubTab] = useState<SubTab>(
        canSeeCurrentBreaks ? 'current-breaks' : 'break-history'
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                {canSeeCurrentBreaks && (
                    <Button
                        variant={activeSubTab === 'current-breaks' ? 'primary' : 'outline'}
                        onClick={() => setActiveSubTab('current-breaks')}
                        className="rounded-full"
                    >
                        On Break
                    </Button>
                )}
                <Button
                    variant={activeSubTab === 'break-history' ? 'primary' : 'outline'}
                    onClick={() => setActiveSubTab('break-history')}
                    className="rounded-full"
                >
                    Break History
                </Button>
            </div>

            <div className="min-h-[400px]">
                {activeSubTab === 'current-breaks' && canSeeCurrentBreaks && <CurrentBreaksContent />}
                {activeSubTab === 'break-history' && <BreakHistoryContent />}

                {/* Fallback if user selects a tab they shouldn't see */}
                {(!canSeeCurrentBreaks && activeSubTab === 'current-breaks') && (
                    <div className="text-center py-10 text-gray-500">
                        Access Denied or Invalid Selection
                    </div>
                )}
            </div>
        </div>
    );
};
