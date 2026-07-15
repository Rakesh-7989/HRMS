import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { leaveService } from '@/services/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { cn } from '@/utils/cn';
import { Calendar, Gift, PartyPopper, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const HolidaysPage: React.FC = () => {
  const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const today = startOfDay(new Date());

    const { hasPermission } = usePermissions();
    const isHROrAdmin = hasPermission('leave', 'manage');

    // Queries
    const { data: publicHolidays = [], isLoading: publicLoading, refetch: refetchPublic } = useQuery({
        queryKey: ['public-holidays', selectedYear],
        queryFn: () => leaveService.getPublicHolidays({ year: selectedYear }),
    });

    const { data: restrictedHolidays = [], isLoading: restrictedLoading, refetch: refetchRestricted } = useQuery({
        queryKey: ['restricted-holidays', selectedYear],
        queryFn: () => leaveService.getRestrictedHolidays({ year: selectedYear }),
    });

    const { data: myUsage = [] } = useQuery({
        queryKey: ['my-restricted-usage'],
        queryFn: () => leaveService.getMyRestrictedHolidayUsage(),
    });

    // Mutation for claiming restricted holiday
    const claimMutation = useMutation({
        mutationFn: (id: string) => leaveService.claimRestrictedHoliday(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restricted-holidays'] });
            queryClient.invalidateQueries({ queryKey: ['my-restricted-usage'] });
        },
    });

    const isLoading = publicLoading || restrictedLoading;

    // Sort holidays by date
    const sortedPublicHolidays = [...publicHolidays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const sortedRestrictedHolidays = [...restrictedHolidays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Separate upcoming and past holidays
    const upcomingHolidays = sortedPublicHolidays.filter((h) =>
        isAfter(parseISO(h.date), today) || format(parseISO(h.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );
    const pastHolidays = sortedPublicHolidays.filter((h) => isBefore(parseISO(h.date), today));

    // Check if a restricted holiday has been claimed by user
    const isHolidayClaimed = (holidayId: string) => {
        return myUsage.some((usage) => usage.holiday_id === holidayId);
    };

    const getHolidayStatus = (date: string) => {
        const holidayDate = parseISO(date);
        if (isBefore(holidayDate, today)) return 'past';
        if (format(holidayDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'today';
        return 'upcoming';
    };

    return (
        <DashboardLayout
            title={t('calendar.holidays')}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: user?.role === 'ADMIN' || user?.role === 'HR' ? '/dashboard/organization' : '/dashboard/personal' },
                { label: 'Holidays' },
            ]}
        >
            <div className="space-y-6">
                {/* Header */}
                <Card>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-brand-500/10 rounded-lg">
                                <Calendar className="h-6 w-6 text-brand-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Holiday Calendar {selectedYear}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {upcomingHolidays.length} upcoming holidays this year
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                            >
                                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <Button variant="outline" size="sm" onClick={() => { refetchPublic(); refetchRestricted(); }}>
                                <RefreshCw size={16} className="mr-1" />
                                Refresh
                            </Button>
                            {isHROrAdmin && (
                                <Button size="sm" onClick={() => window.location.href = '/leave/settings'}>
                                    Manage Holidays
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {isLoading ? (
                    <Card>
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent" />
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Upcoming Public Holidays */}
                        <Card>
                            <div className="flex items-center gap-2 mb-6">
                                <PartyPopper className="h-5 w-5 text-brand-500" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Upcoming Public Holidays
                                </h3>
                                <span className="ml-2 px-2 py-0.5 bg-brand-500/10 text-brand-500 text-xs rounded-full font-medium">
                                    {upcomingHolidays.length}
                                </span>
                            </div>

                            {upcomingHolidays.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="mx-auto h-10 w-10 mb-2 opacity-50" />
                                    <p>No upcoming public holidays for {selectedYear}</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {upcomingHolidays.map((holiday) => {
                                        const status = getHolidayStatus(holiday.date);
                                        return (
                                            <div
                                                key={holiday.id}
                                                className={cn(
                                                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                                                    status === 'today'
                                                        ? 'bg-brand-500/5 border-brand-500/30 ring-2 ring-brand-500/20'
                                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                                )}
                                            >
                                                <div className={cn(
                                                    'flex flex-col items-center justify-center w-16 h-16 rounded-lg',
                                                    status === 'today' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 shadow-elev-1'
                                                )}>
                                                    <span className={cn(
                                                        'text-xs font-medium',
                                                        status === 'today' ? 'text-white/80' : 'text-gray-500'
                                                    )}>
                                                        {format(parseISO(holiday.date), 'MMM')}
                                                    </span>
                                                    <span className={cn(
                                                        'text-2xl font-bold',
                                                        status === 'today' ? 'text-white' : 'text-gray-900 dark:text-white'
                                                    )}>
                                                        {format(parseISO(holiday.date), 'dd')}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">{holiday.name}</h4>
                                                        {status === 'today' && (
                                                            <span className="px-2 py-0.5 bg-brand-500 text-white text-xs rounded-full">
                                                                Today!
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {format(parseISO(holiday.date), 'EEEE, MMMM d, yyyy')}
                                                    </p>
                                                    {holiday.description && (
                                                        <p className="text-xs text-gray-400 mt-1">{holiday.description}</p>
                                                    )}
                                                </div>
                                                {holiday.is_optional && (
                                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* Restricted/Floating Holidays */}
                        {sortedRestrictedHolidays.length > 0 && (
                            <Card>
                                <div className="flex items-center gap-2 mb-6">
                                    <Gift className="h-5 w-5 text-accent-purple" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Restricted Holidays
                                    </h3>
                                    <span className="ml-2 px-2 py-0.5 bg-accent-purple/10 text-accent-purple text-xs rounded-full font-medium">
                                        {sortedRestrictedHolidays.length}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    You can claim limited restricted holidays based on your policy.
                                </p>

                                <div className="grid gap-3">
                                    {sortedRestrictedHolidays.map((holiday) => {
                                        const isClaimed = isHolidayClaimed(holiday.id);
                                        const isPast = isBefore(parseISO(holiday.date), today);
                                        const canClaim = !isClaimed && !isPast && (holiday.max_claims === undefined || (holiday.claims_used || 0) < holiday.max_claims);

                                        return (
                                            <div
                                                key={holiday.id}
                                                className={cn(
                                                    'flex items-center gap-4 p-4 rounded-lg border',
                                                    isClaimed
                                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                                        : isPast
                                                            ? 'bg-gray-100 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-60'
                                                            : 'bg-brand-50 dark:bg-brand-500/5 border-brand-200 dark:border-brand-800'
                                                )}
                                            >
                                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-white dark:bg-gray-800 rounded-lg shadow-elev-1">
                                                    <span className="text-xs text-gray-500">
                                                        {format(parseISO(holiday.date), 'MMM')}
                                                    </span>
                                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                        {format(parseISO(holiday.date), 'dd')}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {format(parseISO(holiday.date), 'EEEE, MMMM d')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isClaimed ? (
                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium">
                                                            <CheckCircle size={14} />
                                                            Claimed
                                                        </span>
                                                    ) : isPast ? (
                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm">
                                                            <Clock size={14} />
                                                            Expired
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant={canClaim ? 'primary' : 'outline'}
                                                            disabled={!canClaim || claimMutation.isPending}
                                                            onClick={() => claimMutation.mutate(holiday.id)}
                                                            isLoading={claimMutation.isPending}
                                                        >
                                                            Claim Holiday
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        {/* Past Holidays (Collapsible) */}
                        {pastHolidays.length > 0 && (
                            <Card className="opacity-75">
                                <details className="group">
                                    <summary className="flex items-center justify-between cursor-pointer list-none">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-gray-400" />
                                            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                                                Past Holidays
                                            </h3>
                                            <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                                                {pastHolidays.length}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-400 group-open:hidden">Click to expand</span>
                                        <span className="text-sm text-gray-400 hidden group-open:inline">Click to collapse</span>
                                    </summary>
                                    <div className="mt-4 grid gap-2">
                                        {pastHolidays.map((holiday) => (
                                            <div
                                                key={holiday.id}
                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg"
                                            >
                                                <div className="text-center min-w-[50px]">
                                                    <span className="text-xs text-gray-400">
                                                        {format(parseISO(holiday.date), 'MMM dd')}
                                                    </span>
                                                </div>
                                                <span className="text-gray-600 dark:text-gray-400">{holiday.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};


