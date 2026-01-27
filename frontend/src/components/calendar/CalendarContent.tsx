import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
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
    Bell
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export const CalendarContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedState, setSelectedState] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [direction, setDirection] = useState(0);

    // Form state for new company holiday
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');

    // Announcement state
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [annTitle, setAnnTitle] = useState('');
    const [annMessage, setAnnMessage] = useState('');

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

    const { data: companyHolidays = [] } = useQuery({
        queryKey: ['company-holidays'],
        queryFn: () => calendarService.getCompanyHolidays(),
        enabled: user?.role === 'ADMIN' || user?.role === 'HR'
    });

    const { data: announcements = [] } = useQuery({
        queryKey: ['corporate-announcements'],
        queryFn: () => calendarService.getAnnouncements(),
    });

    const addHolidayMutation = useMutation({
        mutationFn: ({ date, name }: { date: string, name: string }) =>
            calendarService.addCompanyHoliday(date, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
            queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
            setIsAddModalOpen(false);
            setNewHolidayDate('');
            setNewHolidayName('');
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

    const canManage = user?.role === 'ADMIN' || user?.role === 'HR';

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
                        <div className="h-1.5 w-6 bg-primary rounded-full" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Corporate Calendar</span>
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                        {format(currentDate, 'MMMM')} <span className="text-primary">{format(currentDate, 'yyyy')}</span>
                    </h2>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 max-w-md">
                        Track national, regional, and company holidays with high precision.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-gray-50/50 dark:bg-white/[0.03] p-1 border border-light-border dark:border-white/5 rounded-2xl">
                        <button
                            onClick={prevMonth}
                            className="p-2.5 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-2.5 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="h-11 bg-white dark:bg-[#111] border border-light-border dark:border-white/5 rounded-2xl px-5 text-xs font-bold uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer hover:border-primary/30 text-gray-700 dark:text-gray-200 shadow-sm"
                    >
                        <option value="">Regions: All</option>
                        {states.map(state => (
                            <option key={state} value={state}>{state.toUpperCase()}</option>
                        ))}
                    </select>

                    {canManage && (
                        <Button onClick={() => setIsAddModalOpen(true)} className="h-11 rounded-2xl shadow-premium px-8 font-bold uppercase tracking-widest text-[11px] group">
                            <Plus size={16} className="mr-2" />
                            Add Holiday
                        </Button>
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
                        <Card className="p-0 border-none shadow-2xl bg-white dark:bg-[#111] overflow-hidden rounded-[2.5rem]">
                            {/* Days labels */}
                            <div className="grid grid-cols-7 border-b border-light-border dark:border-white/5 bg-gray-50/20 dark:bg-white/[0.01]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                    <div key={d} className={cn(
                                        "py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em]",
                                        (i === 0 || i === 6) ? "text-red-500/70" : "text-gray-400 dark:text-gray-600"
                                    )}>
                                        {d}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7">
                                {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                                    <div key={`pad-${i}`} className="min-h-[130px] border-r border-b border-light-border dark:border-white/5 bg-gray-50/5 dark:bg-white/[0.01]"></div>
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
                                                "min-h-[130px] p-4 border-r border-b border-light-border dark:border-white/5 transition-all relative group",
                                                isToday && "bg-primary/[0.02] dark:bg-primary/[0.04]",
                                                !holiday?.holiday_name && "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                            )}
                                        >
                                            {isToday && (
                                                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            )}

                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="mb-4">
                                                    <span className={cn(
                                                        "text-xl font-bold tracking-tighter",
                                                        isToday ? "text-primary" :
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
                                                                "p-3 rounded-2xl flex items-center gap-2 border border-transparent shadow-sm",
                                                                holiday.holiday_type === 'Central' && "bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                                                holiday.holiday_type === 'State' && "bg-purple-50/50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
                                                                holiday.holiday_type === 'Company' && "bg-amber-50/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                                                holiday.holiday_type === 'Weekend' && "bg-gray-100/50 dark:bg-white/5 text-gray-400 dark:text-gray-600"
                                                            )}
                                                        >
                                                            <div className="shrink-0 scale-75 opacity-70">
                                                                {holiday.holiday_type === 'Central' && <Globe size={16} />}
                                                                {holiday.holiday_type === 'State' && <MapPin size={16} />}
                                                                {holiday.holiday_type === 'Company' && <Building size={16} />}
                                                                {holiday.holiday_type === 'Weekend' && <Clock size={16} />}
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-tight truncate">{holiday.holiday_name}</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })}

                                {Array.from({ length: (7 - (endOfMonth(currentDate).getDay() + 1)) % 7 }).map((_, i) => (
                                    <div key={`pad-end-${i}`} className="min-h-[130px] border-r border-b border-light-border dark:border-white/5 bg-gray-50/5 dark:bg-white/[0.01]"></div>
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
                                <button
                                    onClick={() => setIsAnnouncementModalOpen(true)}
                                    className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Add
                                </button>
                            )}
                        </div>
                    </div>

                    <Card className="border-none shadow-xl bg-white dark:bg-[#111] p-5 rounded-[2.5rem] min-h-[250px]">
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
                                        className="p-6 rounded-[2rem] bg-gray-50/50 dark:bg-white/[0.02] border border-light-border dark:border-white/5 relative group hover:bg-white dark:hover:bg-white/[0.04] transition-all"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{ann.title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4 ml-4">{ann.message}</p>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-4">
                                            <Clock size={10} />
                                            {format(new Date(ann.created_at), 'MMM dd, yyyy - hh:mm a')}
                                        </div>
                                        {canManage && (
                                            <button
                                                onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                                                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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
                            <Sparkles size={12} className="text-amber-500/70" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Priority Overrides</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Custom Calendar</h3>
                    </div>

                    <Card className="border-none shadow-xl bg-white dark:bg-[#111] p-5 rounded-[2.5rem] min-h-[250px] flex flex-col">
                        <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {companyHolidays.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-light-border dark:border-white/5 rounded-[2.5rem] py-16 opacity-30">
                                    <div className="p-4 bg-gray-100 dark:bg-black/20 rounded-2xl mb-4">
                                        <Building size={32} />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No Custom Breaks</p>
                                </div>
                            ) : (
                                companyHolidays.map((h) => (
                                    <div key={h.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-gray-50/50 dark:bg-white/[0.02] border border-light-border dark:border-white/5 group">
                                        <div className="flex items-center gap-5">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-black/40 shadow-sm text-primary font-bold">
                                                <span className="text-[10px] uppercase opacity-60">{format(new Date(h.date), 'MMM')}</span>
                                                <span className="text-xl font-bold">{format(new Date(h.date), 'dd')}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{h.holiday_name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{format(new Date(h.date), 'EEEE, yyyy')}</p>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button
                                                className="p-3 text-gray-400 hover:text-red-500 transition-all rounded-xl"
                                                onClick={() => deleteHolidayMutation.mutate(h.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
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
                <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 bg-white dark:bg-[#0a0a0a] max-w-lg">
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
                                className="h-14 rounded-2xl border-light-border dark:border-white/5 focus:ring-1 focus:ring-primary/30 px-6 font-bold bg-gray-50 dark:bg-white/[0.03]"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Holiday Name</Label>
                            <Input
                                placeholder="e.g. Annual Company Break"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                className="h-14 rounded-2xl border-light-border dark:border-white/5 focus:ring-1 focus:ring-primary/30 px-6 font-bold bg-gray-50 dark:bg-white/[0.03]"
                            />
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-light-border dark:border-white/10 uppercase tracking-widest text-[11px]">Cancel</Button>
                            <Button
                                onClick={() => addHolidayMutation.mutate({ date: newHolidayDate, name: newHolidayName })}
                                className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                            >
                                Send Board
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
                <DialogContent className="rounded-[3.5rem] border-none shadow-2xl p-12 bg-white dark:bg-[#0a0a0a] max-w-xl">
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
                                className="h-14 rounded-2xl border-light-border dark:border-white/5 focus:ring-1 focus:ring-primary/20 px-6 font-semibold bg-gray-50/50 dark:bg-white/[0.02] shadow-sm"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-2">Message Details</Label>
                            <textarea
                                className="w-full h-44 rounded-[2rem] border border-light-border dark:border-white/5 focus:ring-1 focus:ring-primary/20 p-8 font-semibold bg-gray-50/50 dark:bg-white/[0.02] resize-none outline-none text-[15px] leading-relaxed shadow-sm transition-all"
                                placeholder="Type your broadcast message here..."
                                value={annMessage}
                                onChange={(e) => setAnnMessage(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <Button
                                variant="outline"
                                onClick={() => setIsAnnouncementModalOpen(false)}
                                className="h-14 rounded-[1.25rem] font-bold uppercase tracking-widest text-[11px] border-light-border dark:border-white/10"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={() => addAnnouncementMutation.mutate({ title: annTitle, message: annMessage })}
                                className="h-14 rounded-[1.25rem] font-bold uppercase tracking-widest text-[11px] bg-[#42275a] hover:bg-[#3a214f] text-white shadow-xl shadow-primary/20"
                            >
                                Send Board
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
