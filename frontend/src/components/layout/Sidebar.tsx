import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useChat } from '@/contexts/ChatContext';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
  /** Optional permission check: [module, action] */
  permission?: [string, string];
  /** Minimum plan level required: 1=STANDARD, 2=PREMIUM, 3=ELITE */
  minPlan?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/personal', roles: ['EMPLOYEE'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/team', roles: ['MANAGER'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/hr', roles: ['HR'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/organization', roles: ['ADMIN'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/system', roles: ['SUPER_ADMIN'] },
  { label: 'Tenants', icon: Building2, path: '/tenants', roles: ['SUPER_ADMIN'] },
  { label: 'Plans', icon: CreditCard, path: '/plans', roles: ['SUPER_ADMIN'] },
  { label: 'Employees', icon: Users, path: '/dashboard/employees', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], permission: ['employees', 'view'] },
  { label: 'Organisation', icon: Building2, path: '/organisation', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], permission: ['organisation', 'view'] },

  { label: 'Attendance', icon: Clock, path: '/attendance', roles: ['HR', 'MANAGER', 'EMPLOYEE', 'ADMIN'], permission: ['attendance', 'view'] },
  { label: 'Calendar', icon: CalendarRange, path: '/calendar', roles: ['HR', 'MANAGER', 'EMPLOYEE', 'ADMIN'], permission: ['calendar', 'view'] },
  { label: 'Leave', icon: Calendar, path: '/leave', roles: ['HR', 'MANAGER', 'EMPLOYEE', 'ADMIN'], permission: ['leave', 'view'] },
  { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], permission: ['reports', 'view'] },

  // Asset Management
  { label: 'Assets', icon: Package, path: '/assets', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], permission: ['assets', 'view'], minPlan: 3 },

  // Payroll
  { label: 'Payroll', icon: Wallet, path: '/payroll', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'], permission: ['payroll', 'view'], minPlan: 2 },

  // Project Management
  { label: 'Projects', icon: FolderKanban, path: '/projects', roles: ['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'], permission: ['projects', 'view'], minPlan: 2 },

  // System
  { label: 'Chat', icon: MessageSquare, path: '/chat', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], permission: ['chat', 'view'], minPlan: 2 },
  // Activity
  { label: 'Activity', icon: Activity, path: '/activity', roles: ['SUPER_ADMIN', 'ADMIN', 'HR'], permission: ['audit_logs', 'view'] },

  // Roles & Permissions (ADMIN only + SUPER_ADMIN)
  { label: 'Roles', icon: Shield, path: '/roles-permissions', roles: ['ADMIN'], permission: ['roles', 'manage'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { totalUnreadCount } = useChat();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { atLeastPlan } = useAuth() as any;

  if (!user) return null;


  const visibleItems = NAV_ITEMS.filter(item => {
    // Plan check
    if (item.minPlan && atLeastPlan && !atLeastPlan(item.minPlan)) return false;

    // For items with a permission field
    if (item.permission) {
      if (!hasPermission(item.permission[0], item.permission[1])) return false;
      // If it's a system role (non-custom), still check the role gate if any
      const isSystemRole = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(user.role);
      if (isSystemRole && item.roles && !item.roles.includes(user.role)) return false;
      return true;
    }

    // For items without permission (dashboards etc): role gate
    if (item.roles && !item.roles.includes(user.role)) {
      // Custom roles without a specific dashboard default to the personal dashboard
      const isCustomRole = !['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(user.role);
      if (isCustomRole && item.path === '/dashboard/personal') return true;
      return false;
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 bg-primary-gradient text-white flex flex-col items-center z-50 w-[90px] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div
          className="relative h-16 w-full flex items-center justify-center
             border-b border-white/10
             bg-primary-gradient
             shadow-sm p-2"
        >
          <img
            src={resolveImageUrl(user?.tenant_settings?.logo_url) || logo}
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full py-4 flex flex-col items-center gap-1 overflow-y-auto sidebar-scroll">
          {visibleItems.map(({ path, label, icon: Icon }, index) => (
            <Link
              key={`${path}-${index}`}
              to={path}
              onClick={() => onClose?.()}
              className={cn(
                'w-full flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                isActive(path)
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {label === 'Chat' && totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-primary-gradient">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </div>
              <span className="text-center leading-tight px-1 max-w-[72px]">
                {t(`sidebar.${label.toLowerCase()}`)}
              </span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};