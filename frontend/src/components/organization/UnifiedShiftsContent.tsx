import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShiftRosterPage } from '@/pages/organization/ShiftRosterPage';
import { ShiftsPage } from '@/pages/organization/ShiftsPage';
import { Calendar, Settings } from 'lucide-react';


export const UnifiedShiftsContent: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('subtab') as any) || 'roster';
    const [activeTab, setActiveTab] = useState<'roster' | 'manage'>(initialTab);

    // Sync subtab with URL
    const handleTabChange = (newTab: typeof activeTab) => {
        setActiveTab(newTab);
        // Preserve other params (like main tab=shifts)
        const newParams = new URLSearchParams(searchParams);
        newParams.set('subtab', newTab);
        setSearchParams(newParams);
    };

    // Sync state if URL changes externally
    useEffect(() => {
        const urlSubtab = searchParams.get('subtab');
        if (urlSubtab && urlSubtab !== activeTab) {
            setActiveTab(urlSubtab as any);
        }
    }, [searchParams]);

    return (
        <div className="h-full flex flex-col">
            {/* Sub-Navigation */}
            <div className="mb-6 flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button
                    onClick={() => handleTabChange('roster')}
                    className={`
                        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                        ${activeTab === 'roster'
                            ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                        }
                    `}
                >
                    <Calendar size={16} />
                    Shift Roster
                </button>
                {['ADMIN', 'HR'].includes(user?.role || '') && (
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`
                        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                        ${activeTab === 'manage'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                            }
                    `}
                    >
                        <Settings size={16} />
                        Manage Shifts
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'roster' ? (
                    <div className="h-full overflow-y-auto pr-2">
                        <ShiftRosterPage />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto pr-2">
                        <ShiftsPage />
                    </div>
                )}
            </div>
        </div>
    );
};
