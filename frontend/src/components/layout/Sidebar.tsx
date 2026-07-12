import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useChat } from '@/contexts/ChatContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Shield,
  Brain,
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  CalendarRange,
  Calendar,
  BarChart3,
  Package,
  Wallet,
  FolderKanban,
  MessageSquare,
  Activity,
  Ticket,
  Target,
  Gift,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permission?: [string, string];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/personal' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/team' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/hr' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/organization' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/system' },
  { label: 'Tenants', icon: Building2, path: '/tenants' },
  { label: 'Plans', icon: CreditCard, path: '/plans' },
  { label: 'Coupons', icon: Ticket, path: '/coupons' },
  { label: 'Employees', icon: Users, path: '/dashboard/employees', permission: ['employees', 'view'] },
  { label: 'Organisation', icon: Building2, path: '/organisation', permission: ['organisation', 'view'] },
  { label: 'Attendance', icon: Clock, path: '/attendance', permission: ['attendance', 'view'] },
  { label: 'Calendar', icon: CalendarRange, path: '/calendar', permission: ['calendar', 'view'] },
  { label: 'Leave', icon: Calendar, path: '/leave', permission: ['leave', 'view'] },
  { label: 'Reports', icon: BarChart3, path: '/reports', permission: ['reports', 'view'] },
  { label: 'Performance', icon: Target, path: '/performance', permission: ['performance', 'view'] },
  { label: 'Recruitment', icon: Users, path: '/recruitment', permission: ['recruitment', 'view'] },
  { label: 'Assets', icon: Package, path: '/assets', permission: ['assets', 'view'] },
  { label: 'Payroll', icon: Wallet, path: '/payroll', permission: ['payroll', 'view'] },
  { label: 'Bonus', icon: Gift, path: '/bonus', permission: ['bonus', 'view'] },
  { label: 'Engagement', icon: Heart, path: '/engagement', permission: ['engagement', 'view'] },
  { label: 'Compliance', icon: Shield, path: '/compliance', permission: ['compliance', 'manage'] },
  { label: 'AI Insights', icon: Brain, path: '/ai-insights', permission: ['ai', 'view'] },
  { label: 'Projects', icon: FolderKanban, path: '/projects', permission: ['projects', 'view'] },
  { label: 'Chat', icon: MessageSquare, path: '/chat', permission: ['chat', 'view'] },
  { label: 'Activity', icon: Activity, path: '/activity', permission: ['audit_logs', 'view'] },
  { label: 'Roles', icon: Shield, path: '/roles-permissions', permission: ['roles', 'manage'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  tenants: 'Admin',
  employees: 'People',
  organisation: 'People',
  attendance: 'Time',
  calendar: 'Time',
  leave: 'Time',
  reports: 'Analytics',
  performance: 'Analytics',
  recruitment: 'People',
  assets: 'Resources',
  payroll: 'Finance',
  bonus: 'Finance',
  engagement: 'Culture',
  ai: 'Analytics',
  compliance: 'System',
  projects: 'Projects',
  chat: 'Communication',
  activity: 'System',
  roles: 'System',
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { totalUnreadCount } = useChat();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  const expanded = isHovered;
  const sidebarWidth = expanded ? 'w-64' : 'w-[80px]';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (user.role === 'SUPER_ADMIN') {
      const allowedPaths = ['/dashboard/system', '/tenants', '/plans', '/coupons'];
      return allowedPaths.includes(item.path);
    }
    if (item.permission) {
      const [mod, act] = item.permission;
      switch (mod) {
        case 'attendance':
          return hasAnyPermission([['attendance', 'view_my'], ['attendance', 'view_team'], ['attendance', 'view_all'], ['attendance', 'view_analytics'], ['attendance', 'manage']]);
        case 'leave':
          return hasAnyPermission([['leave', 'view'], ['leave', 'view_balances'], ['leave', 'approve'], ['leave', 'create']]);
        case 'assets':
          return hasAnyPermission([['assets', 'view'], ['assets', 'view_dashboard'], ['assets', 'request']]);
        case 'payroll':
          return hasAnyPermission([['payroll', 'view'], ['payroll', 'view_dashboard'], ['payroll', 'view_payslips']]);
        case 'projects':
          return hasAnyPermission([['projects', 'view'], ['projects', 'view_kanban'], ['projects', 'view_reports']]);
        case 'chat':
          return hasAnyPermission([['chat', 'view'], ['chat', 'send']]);
        default:
          return hasPermission(mod, act);
      }
    }
    if (item.path.includes('/dashboard/')) {
      if (item.path === '/dashboard/system' && user.role === 'SUPER_ADMIN') return true;
      if (item.path === '/dashboard/organization' && user.role === 'ADMIN') return true;
      if (item.path === '/dashboard/hr' && user.role === 'HR') return true;
      if (item.path === '/dashboard/team' && user.role === 'MANAGER') return true;
      if (item.path === '/dashboard/personal' && (user.role === 'EMPLOYEE' || !['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN'].includes(user.role))) return true;
      return false;
    }
    const superAdminPaths = ['/tenants', '/plans', '/coupons'];
    if (superAdminPaths.includes(item.path)) {
      return user.role === 'SUPER_ADMIN';
    }
    return true;
  });

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const getActiveGroup = () => {
    for (const item of visibleItems) {
      if (isActive(item.path)) {
        const key = item.path.split('/')[1] || 'dashboard';
        return GROUP_LABELS[key] || '';
      }
    }
    return '';
  };

  const renderNavItem = (item: NavItem, index: number) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const showLabel = item.label === 'Chat' && totalUnreadCount > 0;

    return (
      <Link
        key={`${item.path}-${index}`}
        to={item.path}
        onClick={() => onClose?.()}
        className={cn(
          'relative flex items-center gap-3 mx-2 my-0.5 rounded-xl transition-all duration-200',
          expanded ? 'px-3 py-2.5' : 'justify-center p-2.5',
          active
            ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-brand-500 dark:bg-brand-400"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative shrink-0">
          <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
          {showLabel && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white shadow-elev-1 ring-2 ring-white dark:ring-neutral-900">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {t(`sidebar.${item.label.toLowerCase()}`)}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  const activeGroup = getActiveGroup();

  return (
    <>
      <style>{`
        .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .sidebar-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-neutral-950 dark:bg-black border-r border-white/5 transition-all duration-300 ease-spring',
          sidebarWidth,
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/5 shrink-0">
          <div className={cn('flex items-center gap-3', !expanded && 'justify-center w-full')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-elev-4 shrink-0">
              <span className="text-white text-sm font-black">H</span>
            </div>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <span className="text-white text-base font-bold whitespace-nowrap">HRMS</span>
                  <p className="text-[10px] text-neutral-400 font-medium -mt-0.5">Enterprise Suite</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active group label (collapsed) */}
        {!expanded && activeGroup && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest text-center">
              {activeGroup}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 space-y-0.5">
          {visibleItems.map((item, index) => renderNavItem(item, index))}
        </nav>

        {/* Bottom section - User */}
        <div className="border-t border-white/5 p-3 shrink-0">
          <div className={cn(
            'flex items-center gap-3 rounded-xl transition-colors',
            expanded ? 'px-2 py-2' : 'justify-center py-2'
          )}>
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-elev-1">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-white truncate">{user?.first_name}</p>
                  <p className="text-[10px] text-neutral-400 font-medium truncate">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse indicator */}
        <div className="hidden md:flex justify-center pb-3">
           <Button variant="ghost" 
            onClick={() => {}}
            className="w-6 h-6 rounded-full bg-neutral-800 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </Button>
        </div>
      </aside>
    </>
  );
};
