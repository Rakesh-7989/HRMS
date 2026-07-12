import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Clock, CheckCircle, History } from 'lucide-react';
import { TimesheetApprovals } from '@/components/projects/TimesheetApprovals';
import { TimesheetDashboard } from '@/components/timesheets/TimesheetDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
export const TimesheetContent: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const canManage = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '');

    const [activeTab, setActiveTab] = useState<'my' | 'approvals'>(canManage ? 'approvals' : 'my');
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header section with Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center shadow-elev-1">
                            <Clock size={22} className="stroke-[2.5px]" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            {t('timesheets.timePortal')}
                        </h1>
                    </div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('timesheets.subTitle')}</p>
                </div>

                {canManage && (
                    <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-950/40 rounded-xl border border-gray-100 dark:border-gray-800">
                         <Button variant="ghost" 
                            onClick={() => setActiveTab('my')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'my'
                                    ? "bg-white dark:bg-gray-800 text-brand-500 shadow-elev-1 ring-1 ring-black/5"
                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <History size={14} />
                            {t('timesheets.myLog')}
                        </Button>
                         <Button variant="ghost" 
                            onClick={() => setActiveTab('approvals')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'approvals'
                                    ? "bg-white dark:bg-gray-800 text-brand-500 shadow-elev-1 ring-1 ring-black/5"
                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <CheckCircle size={14} />
                            {t('timesheets.auditQueue')}
                        </Button>
                    </div>
                )}
            </div>

            {activeTab === 'my' ? (
                <div className="grid grid-cols-1 gap-12">
                    {/* Dashboard Section */}
                    <div className="w-full">
                        <TimesheetDashboard />
                    </div>

                </div>
            ) : (
                <div className="animate-fadeIn">
                    <TimesheetApprovals />
                </div>
            )}
        </div>
    );
};
