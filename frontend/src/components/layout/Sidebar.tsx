import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/utils/cn';
import { resolveImageUrl } from '@/utils/image';
import logo from '../../../Assests/logo.png';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Building2,
  BarChart3,
  Package,
  FolderKanban,
  Activity,
  CalendarRange,
  Wallet,
  MessageSquare,
  CreditCard,
  Shield,
  Tag,
  Settings,
} from 'lucide-react';


interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permissions: string[];  // User must have at least ONE of these
}

const NAV_ITEMS: NavItem[] = [
  // Dashboards — shown based on role via permissions
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/system', permissions: ['platform.manage_tenants'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/organization', permissions: ['view_admin_dashboard'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/hr', permissions: ['view_hr_reports'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/team', permissions: ['approve_attendance_regularization', 'approve_leave'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/personal', permissions: ['view_own_attendance', 'view_own_leave'] },

  // Super Admin - strictly restricted to platform owners
  { label: 'Tenants', icon: Building2, path: '/tenants', permissions: ['platform.manage_tenants'] },
  { label: 'Plans', icon: CreditCard, path: '/plans', permissions: ['platform.manage_tenants'] },
  { label: 'Coupons', icon: Tag, path: '/coupons', permissions: ['platform.manage_coupons'] },

  // Employees
  { label: 'Employees', icon: Users, path: '/dashboard/employees', permissions: ['view_all_employees', 'create_employee'] },

  // Organisation
  { label: 'Organisation', icon: Building2, path: '/organisation', permissions: ['view_organization_structure', 'manage_departments'] },

  // Attendance
  { label: 'Attendance', icon: Clock, path: '/attendance', permissions: ['view_own_attendance', 'view_all_attendance', 'mark_attendance'] },

  // Calendar
  { label: 'Calendar', icon: CalendarRange, path: '/calendar', permissions: ['view_calendar'] },

  // Leave
  { label: 'Leave', icon: Calendar, path: '/leave', permissions: ['view_own_leave', 'approve_leave', 'manage_leave_policies'] },

  // Reports
  { label: 'Reports', icon: BarChart3, path: '/reports', permissions: ['view_hr_reports', 'view_all_payroll'] },

  // Assets
  { label: 'Assets', icon: Package, path: '/assets', permissions: ['view_assets', 'request_asset', 'manage_all_assets'] },

  // Payroll
  { label: 'Payroll', icon: Wallet, path: '/Payroll', permissions: ['view_own_payslip', 'view_all_payroll', 'manage_payroll_components'] },

  // Projects
  { label: 'Projects', icon: FolderKanban, path: '/projects', permissions: ['view_projects'] },

  // Chat
  { label: 'Chat', icon: MessageSquare, path: '/chat', permissions: ['access_chat'] },

  // Activity/Audit
  { label: 'Activity', icon: Activity, path: '/activity', permissions: ['view_audit_logs', 'view_admin_dashboard', 'platform.manage_tenants'] },

  // Roles & Permissions management
  { label: 'Roles', icon: Shield, path: '/roles', permissions: ['manage_roles'] },

  // Settings
  { label: 'Settings', icon: Settings, path: '/settings', permissions: ['manage_roles'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermission();
  const { totalUnreadCount } = useChat();
  const { pathname } = useLocation();

  if (!user) return null;

  // Slots to prevent duplicate primary navigation items (e.g., multiple dashboards)
  const dashboardPaths = [
    '/dashboard/system',
    '/dashboard/organization',
    '/dashboard/hr',
    '/dashboard/team',
    '/dashboard/personal',
  ];

  let dashboardFound = false;

  const visibleItems = NAV_ITEMS.filter(item => {
    // 1. Core Permission Check
    if (!hasAnyPermission(item.permissions)) return false;

    // 2. Dashboard Slot Management (Exclusive)
    if (dashboardPaths.includes(item.path)) {
      if (dashboardFound) return false;
      dashboardFound = true;
    }

    return true;
  });

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <>
      <style>
        {`
          .sidebar-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .sidebar-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-24 bg-gradient-to-b from-[#4a3a60] via-[#3a2a50] to-[#2a1a40] border-r border-white/5 flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-center border-b border-white/5 bg-white/5">
          <Link to="/dashboard" className="flex items-center justify-center w-full h-full">
            <img
              src={
                user?.tenant_settings?.logo_url
                  ? resolveImageUrl(user.tenant_settings.logo_url)
                  : logo
              }
              alt="logo"
              className="h-10 w-auto object-contain brightness-0 invert opacity-95"
            />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full py-4 flex flex-col items-center gap-1 overflow-y-auto sidebar-scroll">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'w-full flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-center leading-tight px-1 max-w-[72px]">
                  {item.label}
                </span>

                {item.label === 'Chat' && totalUnreadCount > 0 && (
                  <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1 font-extrabold shadow-sm">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};