import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, Calendar, ChevronRight, ChevronLeft, Sparkles, UserX,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, CheckSquare,
  Filter, ExternalLink, Folder
} from 'lucide-react';
import { format, isAfter, parseISO, eachDayOfInterval, subDays, getDay, differenceInDays } from 'date-fns';
import { getGreeting, formatInTimezone } from '@/utils/timeFormat';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Sector
} from 'recharts';
import { showToast } from '@/utils/toast';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { dashboardService } from '@/services/dashboard.service';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceService } from '@/services/attendance.service';
import { leaveService } from '@/services/leave.service';
import { projectsService } from '@/services/projects.service';

// --- Types ---
interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
  assigned_to?: string;
  assignees?: { id: string }[];
  column_key?: string;
}

// --- Premium UI Components ---

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800/50 rounded-2xl ${className}`} />
);

const ChartCard = ({
  title, subtitle, badge, children, className = '', delay = 0, headerAction
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  headerAction?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-white dark:bg-[#0f172a] rounded-[1.5rem] p-5 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 ${className}`}
  >
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4 md:gap-0">
      <div className="w-full md:w-auto">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight break-words">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start sm:justify-end">
        {headerAction}
        {badge && (
          <span className="px-2 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm shrink-0 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
    </div>
    {children}
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 min-w-[150px]">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-white/5 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-xs font-medium text-slate-300">{entry.name}</span>
            </div>
            <span className="text-xs font-black">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({
  title, value, subtitle, icon: Icon, gradient, delay = 0, trend
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  gradient: string;
  delay?: number;
  trend?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -5, scale: 1.02 }}
    className="relative group"
  >
    <div
      className="relative overflow-hidden rounded-[1.5rem] p-5 h-full bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5"
    >
      {/* Decorative Pattern - Subtle */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="40" fill="currentColor" className="text-slate-900 dark:text-white" />
          <circle cx="10" cy="80" r="20" fill="currentColor" className="text-slate-900 dark:text-white" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/10"
            style={{ background: gradient }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <h3 className="text-4xl font-black mb-1 tracking-tighter leading-none text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">{title}</p>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-2 font-medium bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full w-fit tracking-wide border border-slate-100 dark:border-white/5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </motion.div>
);

const ActiveMemberCard = ({ member, delay = 0, onClick }: { member: any; delay?: number; onClick?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ x: 5 }}
    onClick={onClick}
    className="flex items-center justify-between p-4 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 group transition-all cursor-pointer w-full"
  >
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
          {member.first_name[0]}{member.last_name[0]}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${member.on_leave_today > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-900 dark:text-white text-sm break-words leading-tight">{member.first_name} {member.last_name}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest break-words">{member.designation || 'Team Member'}</p>
      </div>
    </div>
    <div className="flex items-center gap-4 shrink-0 ml-3">
      <div className="text-right hidden sm:block">
        <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${member.on_leave_today > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
          {member.on_leave_today > 0 ? 'Away' : 'Active'}
        </p>
      </div>
      <button className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  </motion.div>
);

// --- Main Dashboard Implementation ---

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // State for Attendance Chart Date Range
  const [attendanceDateRange, setAttendanceDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'), // Default to Today
    end: format(new Date(), 'yyyy-MM-dd')
  });


  // Tooltip State for Matrix (Fixed Positioning to escape overflow)
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    content: {
      date: Date;
      member: any;
      statusLabel: string;
      record: any;
    };
  } | null>(null);

  const handleTooltip = (e: React.MouseEvent, date: Date, member: any, statusLabel: string, record: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      x: rect.left + rect.width / 2,
      y: rect.top,
      content: { date, member, statusLabel, record }
    });
  };

  // --- Data Fetching ---

  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ['dashboard', 'team'],
    queryFn: () => dashboardService.getTeamDashboard(),
    enabled: user?.role === 'MANAGER',
  });

  // Attendance Analytics with dynamic date range
  const { data: attendanceTrends, isLoading: isAttendanceLoading, isFetching: isAttendanceFetching } = useQuery({
    queryKey: ['dashboard', 'attendance-analytics', attendanceDateRange.start, attendanceDateRange.end],
    queryFn: () => attendanceService.getAttendanceAnalytics({
      from_date: attendanceDateRange.start,
      to_date: attendanceDateRange.end
    }),
    enabled: user?.role === 'MANAGER',
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
  });

  // Fetch detailed team attendance records for the matrix view
  // We fetch an extended range so the grid can show 14-day history even if only "Today" is selected.
  const gridFetchStart = useMemo(() => {
    if (!attendanceDateRange.start || !attendanceDateRange.end) return attendanceDateRange.start;
    const s = parseISO(attendanceDateRange.start);
    const e = parseISO(attendanceDateRange.end);
    // Be consistent with the Grid's visual logic (show context if < 7 days selected)
    if (differenceInDays(e, s) < 7) {
      return format(subDays(e, 14), 'yyyy-MM-dd');
    }
    return attendanceDateRange.start;
  }, [attendanceDateRange]);

  const { data: rawAttendanceRecords } = useQuery({
    queryKey: ['team-attendance-records', gridFetchStart, attendanceDateRange.end],
    queryFn: () => attendanceService.getTeamAttendance({
      from_date: gridFetchStart,
      to_date: attendanceDateRange.end,
      limit: 1000
    }),
    enabled: !!gridFetchStart && !!attendanceDateRange.end && user?.role === 'MANAGER',
  });

  const { data: taskData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['dashboard', 'team-tasks'],
    queryFn: () => projectsService.getTasks(),
    enabled: user?.role === 'MANAGER',
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getProjects(),
    enabled: user?.role === 'MANAGER',
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['dashboard', 'pending-leaves'],
    queryFn: () => leaveService.getPendingApprovals(),
    enabled: user?.role === 'MANAGER',
  });

  // --- Mutations ---
  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveService.approveLeave(id, 'Approved from Dashboard'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'pending-leaves'] });
      showToast.success('Leave approved');
    },
    onError: (err: any) => showToast.error(err.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeave(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'pending-leaves'] });
      showToast.success('Leave rejected');
    },
    onError: (err: any) => showToast.error(err.message || 'Rejection failed'),
  });

  // --- Data Processing ---

  const teamMembers = useMemo(() => {
    return (teamData as any)?.directReports || (teamData as any)?.teamMembers || [];
  }, [teamData]);

  const uniqueTeamMembers = teamMembers;

  const teamMemberIds = useMemo(() => new Set(teamMembers.map((m: any) => m.id)), [teamMembers]);

  // Filter tasks to only show team tasks
  const teamTasks = useMemo(() => {
    const allTasksResult = (taskData as any) || {};
    const allTasks = Array.isArray(allTasksResult) ? allTasksResult : (allTasksResult.tasks || []);
    return allTasks.filter((t: Task) => {
      const isAssigned = t.assigned_to && teamMemberIds.has(t.assigned_to);
      const isMultipleAssigned = t.assignees?.some(a => teamMemberIds.has(a.id));
      return isAssigned || isMultipleAssigned;
    });
  }, [taskData, teamMemberIds]);

  const metrics = useMemo(() => {
    const totalTasks = teamTasks.length;
    const completedTasks = teamTasks.filter((t: any) => t.status === 'DONE' || t.column_key === 'DONE').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Use teamAttendanceToday for real-time status
    // Backend returns STATUS: 'IN_OFFICE', 'COMPLETED', 'ABSENT' using CURRENT_DATE
    const todayRecords = (teamData as any)?.teamAttendanceToday || [];

    const activeCount = todayRecords.filter((r: any) =>
      r.status === 'IN_OFFICE' ||
      r.status === 'COMPLETED' ||
      r.status === 'PRESENT' ||
      r.status === 'HALF_DAY' ||
      (r.check_in_time && r.status !== 'ABSENT')
    ).length;

    // Count explicit Absents or Leaves
    // Backend returns 'ABSENT' if check_in_time is null
    // const absentCount = todayRecords.filter((r: any) => r.status === 'ABSENT' || r.status === 'LEAVE').length;

    // If total records matched team size, we could use absentCount.
    // However, safest fallback for 'Not Here' is (Total - Active).
    const notHere = teamMembers.length - activeCount;

    return {
      total_members: teamMembers.length,
      active_now: activeCount,
      on_leave: notHere,
      completion_rate: completionRate
    };
  }, [teamTasks, teamMembers, teamData]);

  // 1. Team Attendance Analytics
  const attendanceTrendData = useMemo(() => {
    const trends = attendanceTrends?.dailyTrends || [];
    // Create a dictionary for fast lookup
    const trendsMap = trends.reduce((acc: any, curr: any) => {
      // Backend date might be ISO string or YYYY-MM-DD
      const dateKey = format(parseISO(curr.date), 'yyyy-MM-dd');
      acc[dateKey] = curr;
      return acc;
    }, {});

    // Generate all dates in the range to ensure zero-values are shown
    const start = parseISO(attendanceDateRange.start);
    const end = parseISO(attendanceDateRange.end);

    try {
      const allDays = eachDayOfInterval({ start, end });

      return allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const d = trendsMap[dateKey] || {};

        const onTime = Math.max(0, (Number(d.present_count) || 0) - (Number(d.late_count) || 0));
        const late = Number(d.late_count) || 0;

        const totalTeamSize = teamMembers.length || 0;

        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

        // Calculate Absent:
        // If it's a weekend, we assume 0 expected attendance, so 0 Absent.
        // If it's a weekday, Absent = TeamSize - Present check-ins.
        const calculatedAbsent = isWeekend ? 0 : Math.max(0, totalTeamSize - (onTime + late));

        return {
          date: format(day, 'MMM dd'),
          fullDate: dateKey,
          Present: onTime,
          Absent: calculatedAbsent,
          Late: late,
          ActiveMembers: Number(d.active_members) || 0
        };
      });
    } catch (e) {
      // Fallback if date range is invalid
      return [];
    }
  }, [attendanceTrends, attendanceDateRange, teamMembers]);

  // Team Attendance Summary derived from Detailed Records (Matrix Data)
  const teamAttendanceSummary = useMemo(() => {
    if (!attendanceDateRange.start || !attendanceDateRange.end || !uniqueTeamMembers.length) {
      return { totalMembers: uniqueTeamMembers.length, totalPresent: 0, totalLate: 0, totalAbsent: 0, avgWorkHours: 0 };
    }

    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    // Parse range
    const start = parseISO(attendanceDateRange.start);
    const end = parseISO(attendanceDateRange.end);
    let days: Date[] = [];
    try {
      days = eachDayOfInterval({ start, end });
    } catch (e) {
      days = [];
    }

    // Map records for O(1) access
    const attendanceMap: Record<string, any> = {};
    if (Array.isArray(rawAttendanceRecords)) {
      rawAttendanceRecords.forEach((r: any) => {
        if (!r || !r.date) return;
        try {
          // Ensure strict date formatting matching the key generation
          const rDate = format(parseISO(r.date), 'yyyy-MM-dd');
          attendanceMap[`${r.employee_id}-${rDate}`] = r;
        } catch (e) {
          // Skip invalid dates
        }
      });
    }

    uniqueTeamMembers.forEach((member: any) => {
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        // Assuming member.id is the User ID matching employee_id
        const record = attendanceMap[`${member.id}-${dateKey}`];
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const isFuture = isAfter(day, new Date());

        if (record) {
          // If record exists, use its status
          if (record.status === 'PRESENT' || record.status === 'HALF_DAY') {
            totalPresent++;
            if (record.is_late) totalLate++;
            // Note: Half Day is counted as Present here.
          } else if (record.status === 'ABSENT') {
            if (!isWeekend) totalAbsent++;
          }
        } else {
          // No Record
          if (!isWeekend && !isFuture) {
            // Implicit Absent
            totalAbsent++;
          }
        }
      });
    });

    return {
      totalMembers: uniqueTeamMembers.length,
      totalPresent,
      totalLate,
      totalAbsent,
      avgWorkHours: 0
    };
  }, [rawAttendanceRecords, uniqueTeamMembers, attendanceDateRange]);

  // 2. Task Progress Overview (Stacked Bar)
  const taskProgressData = useMemo(() => {
    // To match the Kanban Board view, we should show ALL tasks regardless of creation date.

    // Filter by Selected Project
    // If no project selected (default), show empty or explicit Prompt
    if (!selectedProjectId) return [
      { name: 'To Do', value: 0, fill: '#94a3b8', gradient: 'linear-gradient(to right, #94a3b8, #64748b)' },
      { name: 'In Progress', value: 0, fill: '#6366f1', gradient: 'linear-gradient(to right, #6366f1, #4f46e5)' },
      { name: 'Review', value: 0, fill: '#8b5cf6', gradient: 'linear-gradient(to right, #8b5cf6, #7c3aed)' },
      { name: 'Completed', value: 0, fill: '#10b981', gradient: 'linear-gradient(to right, #10b981, #059669)' }
    ];

    const targetTasks = selectedProjectId === 'ALL'
      ? teamTasks
      : teamTasks.filter((t: any) => t.project_id === selectedProjectId);

    const counts = {
      'TODO': 0,
      'IN_PROGRESS': 0,
      'REVIEW': 0,
      'DONE': 0
    } as Record<string, number>;

    targetTasks.forEach((t: any) => {
      // Normalize Status/Column Key
      const rawStatus = (t.column_key || t.status || '').toString().toUpperCase();

      if (rawStatus.includes('TODO') || rawStatus.includes('BACKLOG') || rawStatus.includes('OPEN') || rawStatus.includes('PENDING')) {
        counts['TODO']++;
      } else if (rawStatus.includes('PROGRESS') || rawStatus.includes('DOING') || rawStatus.includes('h-PROGRESS')) { // 'h-PROGRESS' handles potential casing
        counts['IN_PROGRESS']++;
      } else if (rawStatus.includes('REVIEW') || rawStatus.includes('QA') || rawStatus.includes('TEST')) {
        counts['REVIEW']++;
      } else if (rawStatus.includes('DONE') || rawStatus.includes('COMPL') || rawStatus.includes('CLOSE') || rawStatus.includes('FINISH')) {
        counts['DONE']++;
      } else {
        // Default fallback if status is unknown/new
        counts['TODO']++;
      }
    });

    return [
      { name: 'To Do', value: counts['TODO'], fill: '#94a3b8', gradient: 'linear-gradient(to right, #94a3b8, #64748b)' },
      { name: 'In Progress', value: counts['IN_PROGRESS'], fill: '#6366f1', gradient: 'linear-gradient(to right, #6366f1, #4f46e5)' },
      { name: 'Review', value: counts['REVIEW'], fill: '#8b5cf6', gradient: 'linear-gradient(to right, #8b5cf6, #7c3aed)' },
      { name: 'Completed', value: counts['DONE'], fill: '#10b981', gradient: 'linear-gradient(to right, #10b981, #059669)' }
    ];
  }, [teamTasks, selectedProjectId]);

  // 3. Individual Performance Comparison (with Attendance)
  const performanceData = useMemo(() => {
    // Check for Project Filter
    const relevantTasks = (selectedProjectId && selectedProjectId !== 'ALL')
      ? teamTasks.filter((t: any) => t.project_id === selectedProjectId)
      : teamTasks;

    // Parse attendance date range
    const start = parseISO(attendanceDateRange.start);
    const end = parseISO(attendanceDateRange.end);
    let days: Date[] = [];
    try {
      days = eachDayOfInterval({ start, end });
    } catch (e) {
      days = [];
    }

    // Map attendance records for O(1) access
    const attendanceMap: Record<string, any> = {};
    if (Array.isArray(rawAttendanceRecords)) {
      rawAttendanceRecords.forEach((r: any) => {
        if (!r || !r.date) return;
        try {
          const rDate = format(parseISO(r.date), 'yyyy-MM-dd');
          attendanceMap[`${r.employee_id}-${rDate}`] = r;
        } catch (e) { }
      });
    }

    return teamMembers.map((m: any) => {
      // Task Performance
      const memberTasks = relevantTasks.filter((t: any) =>
        t.assigned_to === m.id || t.assignees?.some((a: any) => a.id === m.id)
      );
      const completed = memberTasks.filter((t: any) => t.column_key === 'DONE' || t.status === 'DONE').length;
      const taskScore = memberTasks.length > 0 ? (completed / memberTasks.length) * 100 : 0;

      // Attendance Performance
      let attendedDays = 0;
      let totalWorkDays = 0;
      days.forEach(day => {
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const isFuture = isAfter(day, new Date());
        if (!isWeekend && !isFuture) {
          totalWorkDays++;
          const dateKey = format(day, 'yyyy-MM-dd');
          const record = attendanceMap[`${m.id}-${dateKey}`];
          if (record && (record.status === 'PRESENT' || record.status === 'HALF_DAY')) {
            attendedDays++;
          }
        }
      });
      const attendanceScore = totalWorkDays > 0 ? (attendedDays / totalWorkDays) * 100 : 0;

      // Overall Performance (average of task and attendance)
      const overallScore = Math.round((taskScore + attendanceScore) / 2);

      return {
        name: `${m.first_name} ${m.last_name.charAt(0)}.`,
        score: overallScore,
        taskScore: Math.round(taskScore),
        attendanceScore: Math.round(attendanceScore),
        fill: overallScore > 80 ? '#10b981' : overallScore > 50 ? '#6366f1' : '#f59e0b',
        tasks: memberTasks.length,
        completed: completed
      };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [teamMembers, teamTasks, selectedProjectId, rawAttendanceRecords, attendanceDateRange]);

  // 4. Workload Distribution (Donut)
  const workloadData = useMemo(() => {
    // Filter tasks by selected project if one is active
    const relevantTasks = (selectedProjectId && selectedProjectId !== 'ALL')
      ? teamTasks.filter((t: any) => t.project_id === selectedProjectId)
      : teamTasks;

    return teamMembers.map((m: any) => {
      const activeTasks = relevantTasks.filter((t: any) =>
        (t.assigned_to === m.id || t.assignees?.some((a: any) => a.id === m.id)) &&
        (t.column_key !== 'DONE' && t.status !== 'DONE')
      ).length;
      return { name: `${m.first_name} ${m.last_name.charAt(0)}.`, value: activeTasks };
    }).filter((d: { value: number }) => d.value > 0);
  }, [teamMembers, teamTasks, selectedProjectId]);

  // 5. Deadline Adherence (Donut)
  const deadlineAdherence = useMemo(() => {
    const now = new Date();
    const completedOnTime = teamTasks.filter((t: any) => {
      if (t.column_key !== 'DONE' && t.status !== 'DONE') return false;
      if (!t.due_date) return true;
      return !isAfter(now, parseISO(t.due_date));
    }).length;

    const overdue = teamTasks.filter((t: any) => {
      if (t.column_key === 'DONE' || t.status === 'DONE') return false;
      if (!t.due_date) return false;
      return isAfter(now, parseISO(t.due_date));
    }).length;

    const ongoing = teamTasks.filter((t: any) => {
      if (t.column_key === 'DONE' || t.status === 'DONE') return false;
      if (!t.due_date) return true;
      return !isAfter(now, parseISO(t.due_date));
    }).length;

    return [
      { name: 'On Time', value: completedOnTime, fill: '#10b981' },
      { name: 'Overdue', value: overdue, fill: '#ef4444' },
      { name: 'Ongoing', value: ongoing, fill: '#6366f1' }
    ];
  }, [teamTasks]);

  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

  const greeting = useMemo(() => {
    return getGreeting(user?.timezone);
  }, [user?.timezone]);

  const totalPending = (pendingRequests as any)?.data?.length || 0;

  // Custom Active Shape for Pie
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.2))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    );
  };

  if (isTeamLoading || isTasksLoading || isAttendanceLoading) {
    return (
      <DashboardLayout title="Manager Dashboard">
        <div className="space-y-8 p-6">
          <Skeleton className="h-64 w-full rounded-[3rem]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-[2.5rem]" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-[450px] lg:col-span-2 rounded-[2.5rem]" />
            <Skeleton className="h-[450px] rounded-[2.5rem]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manager Dashboard">
      <motion.div
        className="space-y-5 pb-10 px-4 lg:px-6 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* --- Welcome Banner --- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] p-6 lg:p-8 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none"
        >
          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <div className="absolute inset-0 text-slate-900 dark:text-white" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='currentColor' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-1"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">
                  {greeting}
                </span>
              </motion.div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                Welcome back, {user?.first_name}! 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base font-medium">
                {totalPending > 0 ? (
                  <>You have <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totalPending} pending requests</span> to review today.</>
                ) : (
                  <>You're all caught up! No pending actions for today.</>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-[1.5rem] p-3 border border-slate-100 dark:border-white/5 shadow-sm"
              >
                <div className="text-center px-3 border-r border-slate-200 dark:border-white/10 min-w-[50px]">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{formatInTimezone(new Date(), user?.timezone, { day: '2-digit' })}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{formatInTimezone(new Date(), user?.timezone, { month: 'short' })}</p>
                </div>
                <div className="text-center px-3 min-w-[50px]">
                  <p className="text-2xl font-black text-indigo-600 leading-none uppercase">{formatInTimezone(new Date(), user?.timezone, { weekday: 'short' })}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">W{format(new Date(), 'w')}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* --- Top Stats --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Direct Reports"
            value={metrics.total_members}
            icon={Users}
            gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            delay={0.1}
            subtitle="Overall Team Strength"
          />
          <StatCard
            title="Active Workforce"
            value={metrics.active_now}
            icon={UserCheck}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            delay={0.2}
            trend={metrics.total_members > 0 ? Math.round((metrics.active_now / metrics.total_members) * 100) : 0}
            subtitle="Currently Working"
          />
          <StatCard
            title="Current Absentees"
            value={metrics.on_leave}
            icon={UserX}
            gradient="linear-gradient(135deg, #f59e0b, #d87706)"
            delay={0.3}
            subtitle="Staff on Leave"
          />
          <StatCard
            title="Task Efficiency"
            value={`${metrics.completion_rate}%`}
            icon={CheckSquare}
            gradient="linear-gradient(135deg, #ec4899, #db2777)"
            delay={0.4}
            trend={metrics.completion_rate > 80 ? 12 : -5}
            subtitle="Sprint Progress"
          />
        </div>

        {/* --- Main Charts Row --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Team Attendance Analytics */}
          <ChartCard
            title="Team Attendance Analytics"
            subtitle={`${attendanceDateRange.start} to ${attendanceDateRange.end}`}
            className="lg:col-span-2"
            delay={0.5}
            badge={isAttendanceFetching ? 'Loading...' : 'Live Data'}
            headerAction={
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                {!(attendanceDateRange.start === format(new Date(), 'yyyy-MM-dd') &&
                  attendanceDateRange.end === format(new Date(), 'yyyy-MM-dd')) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[10px] font-black text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setAttendanceDateRange({
                        start: format(new Date(), 'yyyy-MM-dd'),
                        end: format(new Date(), 'yyyy-MM-dd')
                      })}
                    >
                      RESET TO TODAY
                    </Button>
                  )}
                <div className="w-full sm:w-[220px] min-w-0">
                  <DateRangePicker
                    startDate={attendanceDateRange.start}
                    endDate={attendanceDateRange.end}
                    onStartDateChange={(s) => setAttendanceDateRange(prev => ({ ...prev, start: s }))}
                    onEndDateChange={(e) => setAttendanceDateRange(prev => ({ ...prev, end: e }))}
                    placeholder="Select Date Range"
                    className="!px-3 !py-1.5 !rounded-xl text-[10px]"
                  />
                </div>
              </div>
            }
          >
            {isAttendanceFetching && !attendanceTrends ? (
              <div className="h-[380px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-bold">Loading attendance data...</p>
                </div>
              </div>
            ) : attendanceTrendData.length === 0 || teamMembers.length === 0 ? (
              <div className="h-[380px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">
                  {teamMembers.length === 0 ? 'No Team Members Found' : 'No Attendance Data'}
                </h4>
                <p className="text-xs text-slate-400">
                  {teamMembers.length === 0 ? 'Add employees to your team to see analytics' : 'Try selecting a different date range'}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-2 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-50 dark:border-white/5 pb-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Size</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-600">
                        {teamAttendanceSummary.totalMembers}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">members</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Present</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-600">
                        {teamAttendanceSummary.totalPresent}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">check-ins</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Lates</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-600">
                        {teamAttendanceSummary.totalLate}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">late logins</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Absent</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-rose-500">
                        {teamAttendanceSummary.totalAbsent}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">absent</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto pb-4 custom-scrollbar px-2">
                  <div className="min-w-[800px]">
                    {/* Matrix Container */}
                    <div className="flex flex-col gap-2">

                      {/* Header Row (Dates) */}
                      <div className="flex">
                        {/* Spacer for Names Column (Sticky) */}
                        <div className="w-[140px] sm:w-[180px] flex-shrink-0 sticky left-0 z-20 bg-white dark:bg-[#0f172a] border-r border-slate-50 dark:border-white/5 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"></div>
                        {/* Dates */}
                        <div className="flex gap-1">
                          {(() => {
                            const start = parseISO(attendanceDateRange.start);
                            const end = parseISO(attendanceDateRange.end);

                            // Smart Context: If range is short (< 7 days), show last 15 days context
                            let visualStart = start;
                            if (differenceInDays(end, start) < 7) {
                              visualStart = subDays(end, 14);
                            }

                            const days = eachDayOfInterval({ start: visualStart, end });
                            return days.map((day, i) => (
                              <div key={i} className="w-8 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 font-medium">{format(day, 'EEE')}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{format(day, 'dd')}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Employee Rows - Vertically Scrollable */}
                      <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {uniqueTeamMembers.map((member: any) => (
                          <div key={member.id} className="flex items-center group/row">
                            {/* Name Column */}
                            {/* Name Column (Sticky) */}
                            <div className="w-[140px] sm:w-[180px] flex-shrink-0 flex items-center gap-3 pr-4 sticky left-0 z-20 bg-white dark:bg-[#0f172a] border-r border-slate-50 dark:border-white/5 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                {member.first_name?.[0]}{member.last_name?.[0]}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-xs sm:text-sm font-semibold truncate text-slate-700 dark:text-slate-200">
                                  {member.first_name} {member.last_name}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                                  {member.designation?.name || member.role || 'Team Member'}
                                </span>
                              </div>
                            </div>

                            {/* Attendance Cells */}
                            <div className="flex gap-1">
                              {(() => {
                                const start = parseISO(attendanceDateRange.start);
                                const end = parseISO(attendanceDateRange.end);

                                // Smart Context: If range is short (< 7 days), show last 15 days context
                                let visualStart = start;
                                if (differenceInDays(end, start) < 7) {
                                  visualStart = subDays(end, 14);
                                }

                                const days = eachDayOfInterval({ start: visualStart, end });

                                return days.map((day, i) => {
                                  const dateKey = format(day, 'yyyy-MM-dd');
                                  const record = rawAttendanceRecords?.find((r: any) => {
                                    if (!r || !r.date) return false;
                                    try {
                                      return r.employee_id === member.id && format(parseISO(r.date), 'yyyy-MM-dd') === dateKey
                                    } catch { return false; }
                                  });

                                  // Determine Status & Color
                                  let bgClass = 'bg-slate-100 dark:bg-slate-800'; // Default Empty
                                  let statusLabel = 'Absent';

                                  const isFuture = isAfter(day, new Date());

                                  if (record) {
                                    if (record.status === 'PRESENT') {
                                      bgClass = record.is_late ? 'bg-amber-400' : 'bg-emerald-500';
                                      statusLabel = record.is_late ? 'Late' : 'Present';
                                    } else if (record.status === 'HALF_DAY') {
                                      bgClass = 'bg-amber-400';
                                      statusLabel = 'Half Day';
                                    } else if (record.status === 'ABSENT') {
                                      bgClass = 'bg-rose-500';
                                      statusLabel = 'Absent';
                                    }
                                  } else if (!isFuture) {
                                    // If past and no record, assume Absent (but verify weekend?)
                                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                    if (isWeekend) {
                                      bgClass = 'bg-slate-50 dark:bg-white/5 opacity-50'; // Weekend
                                      statusLabel = 'Weekend';
                                    } else {
                                      bgClass = 'bg-rose-200 dark:bg-rose-900/30'; // Missing/Absent
                                      statusLabel = 'Absent';
                                    }
                                  }

                                  return (
                                    <div
                                      key={i}
                                      className="group/cell relative"
                                      onMouseEnter={(e) => handleTooltip(e, day, member, statusLabel, record)}
                                      onMouseLeave={() => setTooltipData(null)}
                                    >
                                      <div className={`w-8 h-8 rounded-md transition-all hover:scale-110 ${bgClass}`} />
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Fixed Tooltip Overlay */}
                {tooltipData && (
                  <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                      top: tooltipData.y - 10,
                      left: tooltipData.x,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 text-xs min-w-[120px]">
                      <div className="font-bold whitespace-nowrap">{format(tooltipData.content.date, 'MMM dd, yyyy')}</div>
                      <div className="text-[10px] text-slate-500 mb-1">{tooltipData.content.member.first_name}</div>
                      <div className={`font-semibold ${tooltipData.content.statusLabel === 'Present' ? 'text-emerald-500' :
                        tooltipData.content.statusLabel === 'Late' ? 'text-amber-500' :
                          tooltipData.content.statusLabel === 'Absent' ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                        {tooltipData.content.statusLabel}
                      </div>
                      {tooltipData.content.record?.check_in_time && (() => {
                        try {
                          return <div className="text-[10px] text-slate-400 mt-1">In: {format(parseISO(tooltipData.content.record.check_in_time), 'HH:mm')}</div>;
                        } catch (e) { return null; }
                      })()}
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500">On Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-[10px] font-bold text-slate-500">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-[10px] font-bold text-slate-500">Absent</span>
                  </div>
                </div>
              </>
            )}
          </ChartCard>

          {/* Task Progress Overview (Horizontal Bar) */}
          <ChartCard
            title={!selectedProjectId ? "Select Project" : "Task Pipeline"}
            subtitle={!selectedProjectId ? "Please select a project to view status" : "Current delivery workload status"}
            delay={0.6}
            badge="Active"
            headerAction={
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="form-select bg-slate-50 dark:bg-slate-800 border-none text-xs font-bold text-slate-600 dark:text-slate-300 py-1.5 focus:ring-0 cursor-pointer"
                >
                  <option value="" disabled>Select Project</option>
                  {/*  */}
                  {projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="h-[280px] mt-2 flex flex-col">
              {!selectedProjectId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Folder className="w-8 h-8 opacity-50" />
                  </div>
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-1">No Project Selected</h4>
                  <p className="text-xs text-slate-400">Please select a project from the dropdown to view the pipeline</p>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskProgressData} layout="vertical" margin={{ left: -10 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Bar
                          dataKey="value"
                          name="Count"
                          radius={[0, 15, 15, 0]}
                          barSize={24}
                          animationDuration={2000}
                        >
                          {taskProgressData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={_entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {taskProgressData.map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-3xl border border-slate-100 dark:border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-full ring-4 ring-current/10" style={{ backgroundColor: item.fill }} />
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.name}</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{item.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ChartCard>
        </div>

        {/* --- Secondary Charts Row --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Managed Workforce (moved from bottom) */}
          <ChartCard
            title="Managed Workforce"
            subtitle={`${teamMembers.length} Direct collaborators in your orbit`}
            delay={0.7}
            badge="Live Status"
          >
            <div className="space-y-3 overflow-y-auto pr-4 custom-scrollbar">
              {teamMembers.map((member: any, i: number) => (
                <ActiveMemberCard
                  key={member.id}
                  member={member}
                  delay={0.8 + i * 0.05}
                  onClick={() => navigate(`/dashboard/employees/${member.user_id}`)}
                />
              ))}
            </div>
          </ChartCard>

          {/* Workload Distribution (Donut) */}
          <ChartCard
            title="Workload Balance"
            subtitle="Active task distribution"
            delay={0.8}
            badge={`${workloadData.length} active`}
          >
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(undefined)}
                  >
                    {workloadData.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Active</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                  {workloadData.reduce((acc: number, curr: any) => acc + curr.value, 0)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-3">
              {workloadData.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 break-words leading-tight flex-1">{item.name}</span>
                  <span className="text-[11px] font-black text-slate-900 dark:text-white shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Deadline Adherence (Donut) */}
          <ChartCard
            title="Risk Assessment"
            subtitle="Deadline adherence metrics"
            delay={0.9}
            badge="Critical"
          >
            <div className="h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deadlineAdherence}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={0}
                    dataKey="value"
                    labelLine={false}
                    animationBegin={500}
                    animationDuration={2000}
                  >
                    {deadlineAdherence.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              {deadlineAdherence.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full ring-4 ring-current/5" style={{ backgroundColor: item.fill }} />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform">{item.value}</span>
                    <span className="text-[10px] font-black text-slate-400 w-12 text-right bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {teamTasks.length > 0 ? Math.round((item.value / teamTasks.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* --- Team Roster & Leave Requests --- */}
        <div className="grid grid-cols-1 lg:grid-cols-[70%_28%] gap-5">
          {/* Performance Index Carousel (moved from top) */}
          <ChartCard
            title="Performance Index"
            subtitle="Team member performance"
            delay={1.0}
            headerAction={<Filter className="w-4 h-4 text-slate-400" />}
          >
            {performanceData.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">No Performance Data</h4>
                <p className="text-xs text-slate-400">Select a project to view team performance</p>
              </div>
            ) : (
              <div className="relative mt-4">
                {/* Navigation Arrows */}
                <button
                  onClick={() => {
                    const container = document.getElementById('perf-carousel-bottom');
                    if (container) container.scrollBy({ left: -220, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  onClick={() => {
                    const container = document.getElementById('perf-carousel-bottom');
                    if (container) container.scrollBy({ left: 220, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>

                {/* Carousel Container */}
                <div
                  id="perf-carousel-bottom"
                  className="flex gap-4 overflow-x-auto scroll-smooth px-10 pb-2 hide-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {performanceData.map((item: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex-shrink-0 w-[220px] p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* Avatar */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                          style={{ background: COLORS[i % COLORS.length] }}
                        >
                          {item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.tasks || 0} tasks assigned</p>
                        </div>
                      </div>

                      {/* Score Circle with Overall % */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative w-24 h-24">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke={item.score > 80 ? '#10b981' : item.score > 50 ? '#6366f1' : item.score > 0 ? '#f59e0b' : '#94a3b8'}
                              strokeWidth="6"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${(item.score / 100) * 251} 251`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-slate-800 dark:text-white">{item.score}%</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Overall</span>
                          </div>
                        </div>
                      </div>

                      {/* Horizontal Progress Bars */}
                      <div className="space-y-2">
                        {/* Attendance Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Attendance</span>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{item.attendanceScore || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.attendanceScore || 0}%` }}
                            />
                          </div>
                        </div>
                        {/* Tasks Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tasks</span>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{item.taskScore || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.taskScore || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>

          {/* Pending Leave Requests */}
          <ChartCard
            title="Action Center"
            subtitle="Approvals awaiting your verification"
            delay={1.2}
            badge={`${totalPending} Pending`}
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => navigate('/leave?tab=team-requests')} className="text-[10px] font-black text-indigo-600 bg-indigo-50 border-none hover:bg-indigo-100 px-4 py-2 rounded-full flex items-center gap-2">
                All Requests
                <ExternalLink className="w-3 h-3" />
              </Button>
            }
          >
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {totalPending > 0 ? (
                  (pendingRequests as any).data.map((request: any, i: number) => (
                    <motion.div
                      key={request.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 shadow-md hover:shadow-xl transition-all group"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20 group-hover:rotate-6 transition-transform">
                            <Calendar className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 dark:text-white text-base">{request.first_name} {request.last_name}</h4>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                              {request.leave_type} <span className="text-slate-400 mx-2">•</span> {format(parseISO(request.start_date), 'MMM dd')} - {format(parseISO(request.end_date), 'MMM dd')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => approveMutation.mutate(request.id)}
                            className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 shadow-sm"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const reason = prompt('Reason for rejection:');
                              if (reason) rejectMutation.mutate({ id: request.id, reason });
                            }}
                            className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 shadow-sm"
                          >
                            <XCircle className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">"{request.reason}"</p>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Inbox Zero</h3>
                    <p className="text-sm text-slate-500">No pending leave requests at the moment.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ChartCard>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};
