import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { calendarService, CalendarDay } from '@/services/calendar.service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    MapPin,
    Building,
    Globe,
    Trash2,
    Sparkles,
    PartyPopper,
    Clock,
    Bell,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';

import { usePermissions } from '@/contexts/PermissionsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export const CalendarContent: React.FC = () => {
    const { t } = useTranslation();
    useAuth();
    const queryClient = useQueryClient();
    const { hasPermission } = usePermissions();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedState, setSelectedState] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [direction, setDirection] = useState(0);

    // Form state for new company holiday
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayState, setNewHolidayState] = useState('');

    // Announcement state
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [annTitle, setAnnTitle] = useState('');
    const [annMessage, setAnnMessage] = useState('');

    // Import state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const { data: calendarData = [] } = useQuery({
        queryKey: ['calendar', month, year, selectedState],
        queryFn: () => calendarService.getCalendar(month, year, selectedState),
    });

    const { data: states = [] } = useQuery({
        queryKey: ['calendar-states'],
        queryFn: () => calendarService.getStates(),
    });

    const canManage = hasPermission('calendar', 'manage');
    const canViewGlobal = hasPermission('calendar', 'view_global') || canManage;

    const { data: companyHolidays = [] } = useQuery({
        queryKey: ['company-holidays'],
        queryFn: () => calendarService.getCompanyHolidays(),
        enabled: canViewGlobal
    });

    const { data: announcements = [] } = useQuery({
        queryKey: ['corporate-announcements'],
        queryFn: () => calendarService.getAnnouncements(),
    });
    const { data: allStates = [] } = useQuery({
        queryKey: ['states'],
        queryFn: calendarService.getStates,
        staleTime: 1000 * 60 * 60
    });

    const addCompanyHolidayMutation = useMutation({
        mutationFn: (data: { date: string; holiday_name: string; state?: string }) =>
            calendarService.addCompanyHoliday(data.date, data.holiday_name, data.state),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
            queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
            setIsAddModalOpen(false);
            setNewHolidayDate('');
            setNewHolidayName('');
            setNewHolidayState('');
        }
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: (id: number) => calendarService.deleteCompanyHoliday(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
            queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
        }
    });

    const addAnnouncementMutation = useMutation({
        mutationFn: ({ title, message }: { title: string, message: string }) =>
            calendarService.createAnnouncement(title, message),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['corporate-announcements'] });
            setIsAnnouncementModalOpen(false);
            setAnnTitle('');
            setAnnMessage('');
        }
    });

    const importHolidaysMutation = useMutation({
        mutationFn: (file: File) => calendarService.importHolidays(file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
            queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
            setImportStatus({ type: 'success', message: `Successfully imported ${data.imported} holidays for ${data.years.join(', ')}` });
            setImportFile(null);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            setImportStatus({ type: 'error', message: err.response?.data?.message || err.message || 'Import failed' });
        }
    });

    const deleteAnnouncementMutation = useMutation({
        mutationFn: (id: number) => calendarService.deleteAnnouncement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['corporate-announcements'] });
        }
    });

    const nextMonth = () => {
        setDirection(1);
        setCurrentDate(addMonths(currentDate, 1));
    };
    const prevMonth = () => {
        setDirection(-1);
        setCurrentDate(subMonths(currentDate, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setDirection(today > currentDate ? 1 : -1);
        setCurrentDate(today);
    };

    const monthDays = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const holidayMap = useMemo(() => {
        return calendarData.reduce((acc, day) => {
            acc[day.date] = day;
            return acc;
        }, {} as Record<string, CalendarDay>);
    }, [calendarData]);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 30 : -30,
            opacity: 0,
            scale: 0.98
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 30 : -30,
            opacity: 0,
            scale: 0.98
        })
    };

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto px-4 sm:px-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="h-1.5 w-6 bg-brand-500 rounded-full" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('calendar.corporateCalendar')}</span>
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                        {format(currentDate, 'MMMM')} <span className="text-brand-500">{format(currentDate, 'yyyy')}</span>
                    </h2>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 max-w-md">
                        {t('calendar.description')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row w-full lg:w-auto items-stretch sm:items-center gap-4">
                    <div className="flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.03] p-1 border border-gray-200 dark:border-white/5 rounded-2xl">
                        <Button
                            onClick={prevMonth}
                            variant="ghost"
                            size="sm"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            onClick={goToToday}
                            variant="ghost"
                            className="flex-1 px-6 py-2 font-bold uppercase tracking-widest"
                        >
                            Today
                        </Button>
                        <Button
                            onClick={nextMonth}
                            variant="ghost"
                            size="sm"
                            aria-label="Next month"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>

                    <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="h-11 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl px-5 text-xs font-bold uppercase tracking-widest focus:ring-1 focus:ring-brand-500/20 outline-none transition-all cursor-pointer hover:border-brand-500/30 text-gray-700 dark:text-gray-200 shadow-elev-1"
                    >
                        <option value="">Regions: All</option>
                        {states.map(state => (
                            <option key={state} value={state}>{state.toUpperCase()}</option>
                        ))}
                    </select>

                    {canManage && (
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            <Button
                                onClick={() => { setIsImportModalOpen(true); setImportStatus({ type: 'idle', message: '' }); setImportFile(null); }}
                                variant="outline"
                                className="rounded-2xl uppercase tracking-widest text-[11px]"
                            >
                                <Upload size={14} />
                                Import
                            </Button>
                            <Button onClick={() => setIsAddModalOpen(true)} className="h-11 rounded-2xl shadow-elev-5 px-5 font-bold uppercase tracking-widest text-[11px] group flex-1 sm:flex-initial">
                                <Plus size={14} className="mr-1.5" />
                                Add Holiday
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Calendar View - Single Curved Card */}
            <div className="relative">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentDate.toISOString()}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <Card className="p-0 border-none shadow-elev-6 bg-white dark:bg-[#111] overflow-hidden rounded-3xl md:rounded-[2.5rem]">
                            {/* Days labels */}
                            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-white/[0.01]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                    <div key={d} className={cn(
                                        "py-3 md:py-5 text-center text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]",
                                        (i === 0 || i === 6) ? "text-red-500/70" : "text-gray-400 dark:text-gray-600"
                                    )}>
                                        {d.charAt(0)}<span className="hidden md:inline">{d.slice(1)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7">
                                {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                                    <div key={`pad-${i}`} className="min-h-[60px] md:min-h-[130px] border-r border-b border-gray-200 dark:border-white/5 bg-gray-50/5 dark:bg-white/[0.01]"></div>
                                ))}

                                {monthDays.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const holiday = holidayMap[dateStr];
                                    const isToday = isSameDay(day, new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                    return (
                                        <div
                                            key={dateStr}
                                            className={cn(
                                                "min-h-[60px] md:min-h-[130px] p-1 md:p-4 border-r border-b border-gray-200 dark:border-white/5 transition-all relative group",
                                                isToday && "bg-brand-500/[0.02] dark:bg-brand-500/[0.04]",
                                                !holiday?.holiday_name && "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                            )}
                                        >
                                            {isToday && (
                                                <div className="absolute top-2 right-2 md:top-4 md:right-4 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-brand-500 animate-pulse" />
                                            )}

                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="mb-1 md:mb-4 flex flex-col items-center md:items-start">
                                                    <span className={cn(
                                                        "text-sm md:text-xl font-bold tracking-tighter",
                                                        isToday ? "text-brand-500" :
                                                            isWeekend ? "text-red-500/50" :
                                                                "text-gray-400 dark:text-gray-700 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>

                                                <AnimatePresence>
                                                    {holiday && holiday.holiday_name && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={cn(
                                                                "p-1 md:p-3 rounded-lg md:rounded-2xl flex items-center justify-center md:justify-start gap-1 md:gap-2 border border-transparent shadow-elev-1",
                                                                holiday.holiday_type === 'Central' && "bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400",
                                                                holiday.holiday_type === 'State' && "bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400",
                                                                holiday.holiday_type === 'Company' && "bg-coral-50/50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-400",
                                                                holiday.holiday_type === 'Weekend' && "bg-gray-100/50 dark:bg-white/5 text-gray-400 dark:text-gray-600"
                                                            )}
                                                        >
                                                            <div className="shrink-0 scale-75 opacity-70">
                                                                {holiday.holiday_type === 'Central' && <Globe size={12} className="md:w-4 md:h-4" />}
                                                                {holiday.holiday_type === 'State' && <MapPin size={12} className="md:w-4 md:h-4" />}
                                                                {holiday.holiday_type === 'Company' && <Building size={12} className="md:w-4 md:h-4" />}
                                                                {holiday.holiday_type === 'Weekend' && <Clock size={12} className="md:w-4 md:h-4" />}
                                                            </div>
                                                            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-tight truncate">{holiday.holiday_name}</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })}

                                {Array.from({ length: (7 - (endOfMonth(currentDate).getDay() + 1)) % 7 }).map((_, i) => (
                                    <div key={`pad-end-${i}`} className="min-h-[60px] md:min-h-[130px] border-r border-b border-gray-200 dark:border-white/5 bg-gray-50/5 dark:bg-white/[0.01]"></div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Sections - Exact Layout from Image */}
            <div className="grid lg:grid-cols-2 gap-6 pt-2">
                {/* Left Card: Organization Board */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1 px-2">
                        <div className="flex items-center gap-2">
                            <Bell size={12} className="text-gray-400" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Latest Updates</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Announcements</h3>
                            {canManage && (
                                <Button
                                    onClick={() => setIsAnnouncementModalOpen(true)}
                                    variant="ghost"
                                    size="sm"
                                    className="uppercase tracking-wider"
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                    </div>

                    <Card className="border-none shadow-elev-5 bg-white dark:bg-[#111] p-4 md:p-5 rounded-3xl md:rounded-[2.5rem] min-h-[250px]">
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {announcements.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <PartyPopper className="mx-auto mb-4" size={32} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No active updates</p>
                                </div>
                            ) : (
                                announcements.map((ann) => (
                                    <div
                                        key={ann.id}
                                        className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 relative group hover:bg-white dark:hover:bg-white/[0.04] transition-all"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{ann.title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4 ml-4">{ann.message}</p>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-4">
                                            <Clock size={10} />
                                            {format(new Date(ann.created_at), 'MMM dd, yyyy - hh:mm a')}
                                        </div>
                                        {canManage && (
                                             <Button variant="ghost" 
                                                onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                                                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Card: Custom Calendar */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1 px-2">
                        <div className="flex items-center gap-2">
                            <Sparkles size={12} className="text-coral-500/70" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Priority Overrides</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Custom Calendar</h3>
                    </div>

                    <Card className="border-none shadow-elev-5 bg-white dark:bg-[#111] p-4 md:p-5 rounded-3xl md:rounded-[2.5rem] min-h-[250px] flex flex-col">
                        <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {companyHolidays.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[2.5rem] py-16 opacity-30">
                                    <div className="p-4 bg-gray-100 dark:bg-black/20 rounded-2xl mb-4">
                                        <Building size={32} />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No Custom Breaks</p>
                                </div>
                            ) : (
                                companyHolidays.map((h) => (
                                    <div key={h.id} className="flex items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-[2rem] bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 group">
                                        <div className="flex items-center gap-5">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-black/40 shadow-elev-1 text-brand-500 font-bold">
                                                <span className="text-[10px] uppercase opacity-60">{format(new Date(h.date), 'MMM')}</span>
                                                <span className="text-xl font-bold">{format(new Date(h.date), 'dd')}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{h.holiday_name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{format(new Date(h.date), 'EEEE, yyyy')}</p>
                                            </div>
                                        </div>
                                        {canManage && (
                                             <Button variant="ghost" 
                                                className="p-3 text-gray-400 hover:text-red-500 transition-all rounded-xl"
                                                onClick={() => deleteHolidayMutation.mutate(h.id)}
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modals Refined with Extra Curves */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="rounded-[3rem] border-none shadow-elev-6 p-10 bg-white dark:bg-[#0a0a0a] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-bold tracking-tight text-center mb-8">Add Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Holiday Date</Label>
                            <Input
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                className="h-14 rounded-2xl border-gray-200 dark:border-white/5 focus:ring-1 focus:ring-brand-500/30 px-6 font-bold bg-gray-50 dark:bg-white/[0.03]"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Holiday Name</Label>
                            <Input
                                placeholder="e.g. Annual Company Break"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                className="h-14 rounded-2xl border-gray-200 dark:border-white/5 focus:ring-1 focus:ring-brand-500/30 px-6 font-bold bg-gray-50 dark:bg-white/[0.03]"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Region (Optional)</Label>
                            <select
                                value={newHolidayState}
                                onChange={(e) => setNewHolidayState(e.target.value)}
                                className="w-full h-14 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl px-6 text-sm font-bold focus:ring-1 focus:ring-brand-500/30 outline-none transition-all cursor-pointer shadow-elev-1 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">All Regions</option>
                                {allStates.map(state => (
                                    <option key={state} value={state}>{state.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-gray-200 dark:border-white/10 uppercase tracking-widest text-[11px]">
                                Cancel
                            </Button>
                            <Button
                                onClick={() => addCompanyHolidayMutation.mutate({ date: newHolidayDate, holiday_name: newHolidayName, state: newHolidayState || undefined })}
                                disabled={!newHolidayDate || !newHolidayName || addCompanyHolidayMutation.isPending}
                                className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30"
                            >
                                Send Board
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
                <DialogContent className="rounded-[3.5rem] border-none shadow-elev-6 p-12 bg-white dark:bg-[#0a0a0a] max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-bold tracking-tighter text-center mb-10 text-gray-900 dark:text-white">Broadcast Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-2">Broadcast Title</Label>
                            <Input
                                placeholder="Important update for all team members"
                                value={annTitle}
                                onChange={(e) => setAnnTitle(e.target.value)}
                                className="h-14 rounded-2xl border-gray-200 dark:border-white/5 focus:ring-1 focus:ring-brand-500/20 px-6 font-semibold bg-gray-50/50 dark:bg-white/[0.02] shadow-elev-1"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-2">Message Details</Label>
                            <textarea
                                className="w-full h-44 rounded-[2rem] border border-gray-200 dark:border-white/5 focus:ring-1 focus:ring-brand-500/20 p-8 font-semibold bg-gray-50/50 dark:bg-white/[0.02] resize-none outline-none text-[15px] leading-relaxed shadow-elev-1 transition-all"
                                placeholder="Type your broadcast message here..."
                                value={annMessage}
                                onChange={(e) => setAnnMessage(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <Button
                                variant="outline"
                                onClick={() => setIsAnnouncementModalOpen(false)}
                                className="h-14 rounded-[1.25rem] font-bold uppercase tracking-widest text-[11px] border-gray-200 dark:border-white/10"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={() => addAnnouncementMutation.mutate({ title: annTitle, message: annMessage })}
                                className="h-14 rounded-[1.25rem] font-bold uppercase tracking-widest text-[11px] bg-brand-500 hover:bg-brand-600 text-white shadow-elev-5 shadow-brand-500/20"
                            >
                                Send Board
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportModalOpen} onOpenChange={(open) => { setIsImportModalOpen(open); if (!open) { setImportFile(null); setImportStatus({ type: 'idle', message: '' }); } }}>
                <DialogContent className="rounded-[3rem] border-none shadow-elev-6 p-10 bg-white dark:bg-[#0a0a0a] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-bold tracking-tight text-center mb-4">Import Holidays</DialogTitle>
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center font-medium">
                            Upload an Excel file (.xlsx) with <strong>Date</strong> and <strong>Holiday Name</strong> columns
                        </p>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                        {/* Drag & Drop Area */}
                        <div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { fileInputRef.current?.click(); } }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                                    setImportFile(file);
                                    setImportStatus({ type: 'idle', message: '' });
                                }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
                                isDragging
                                    ? "border-brand-500 bg-brand-500/5 scale-[1.02]"
                                    : importFile
                                        ? "border-green-500/30 bg-green-50/50 dark:bg-green-500/5"
                                        : "border-gray-200 dark:border-white/10 hover:border-brand-500/30 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setImportFile(file);
                                        setImportStatus({ type: 'idle', message: '' });
                                    }
                                    e.target.value = '';
                                }}
                            />
                            {importFile ? (
                                <>
                                    <div className="p-4 bg-green-100 dark:bg-green-500/10 rounded-2xl">
                                        <FileSpreadsheet size={32} className="text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{importFile.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{(importFile.size / 1024).toFixed(1)} KB • Click to change</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                                        <Upload size={32} className="text-gray-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Drop Excel file here</p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-medium">or click to browse • .xlsx, .xls</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Status Messages */}
                        {importStatus.type === 'success' && (
                            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/20">
                                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300">{importStatus.message}</p>
                            </div>
                        )}
                        {importStatus.type === 'error' && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20">
                                <AlertCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300">{importStatus.message}</p>
                            </div>
                        )}

                        {/* Example format hint */}
                        <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Expected Format</p>
                            <div className="grid grid-cols-3 gap-0 text-xs font-mono">
                                <div className="p-2 bg-brand-500/10 text-brand-500 font-bold rounded-tl-lg border-b border-r border-brand-500/10 truncate">Date</div>
                                <div className="p-2 bg-brand-500/10 text-brand-500 font-bold border-b border-r border-brand-500/10 truncate">Holiday Name</div>
                                <div className="p-2 bg-brand-500/10 text-brand-500 font-bold rounded-tr-lg border-b border-brand-500/10 truncate">Region (Opt.)</div>
                                
                                <div className="p-2 text-gray-600 dark:text-gray-400 border-b border-r border-gray-100 dark:border-white/5 truncate">2026-01-26</div>
                                <div className="p-2 text-gray-600 dark:text-gray-400 border-b border-r border-gray-100 dark:border-white/5 truncate">Republic Day</div>
                                <div className="p-2 text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/5 text-[10px] truncate">All</div>
                                
                                <div className="p-2 text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/5 truncate">2026-11-01</div>
                                <div className="p-2 text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/5 truncate">Rajyotsava</div>
                                <div className="p-2 text-gray-600 dark:text-gray-400 truncate">Karnataka</div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportStatus({ type: 'idle', message: '' }); }}
                                className="flex-1 h-14 rounded-2xl font-bold border-gray-200 dark:border-white/10 uppercase tracking-widest text-[11px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => { if (importFile) importHolidaysMutation.mutate(importFile); }}
                                disabled={!importFile || importHolidaysMutation.isPending}
                                className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-elev-4 shadow-brand-500/20 disabled:opacity-50"
                            >
                                {importHolidaysMutation.isPending ? 'Importing...' : 'Import Holidays'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: rgba(155, 155, 155, 0.1); 
                    border-radius: 10px; 
                }
            `}</style>
        </div>
    );
};
