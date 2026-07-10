import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShiftRosterPage } from '@/pages/organization/ShiftRosterPage';
import { ShiftsPage } from '@/pages/organization/ShiftsPage';
import { Calendar, Settings, Search } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Input } from '@/components/ui/Input';


export const UnifiedShiftsContent: React.FC = () => {
    const { hasPermission } = usePermissions();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('subtab') as any) || 'roster';
    const [activeTab, setActiveTab] = useState<'roster' | 'manage'>(initialTab);
    const [rosterSearch, setRosterSearch] = useState('');

    const canManageShifts = hasPermission('shifts', 'manage');

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
            {/* Sub-Navigation and Controls */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
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
                    {canManageShifts && (
                        <button
                            onClick={() => handleTabChange('manage')}
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

                {activeTab === 'roster' && (
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search employees..."
                            className="pl-9 h-10 w-full"
                            value={rosterSearch}
                            onChange={(e) => setRosterSearch(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'roster' ? (
                    <div className="h-full overflow-y-auto pr-2">
                        <ShiftRosterPage searchTerm={rosterSearch} />
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
