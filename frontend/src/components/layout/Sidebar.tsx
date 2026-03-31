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
  CreditCard,
  Shield,
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
} from 'lucide-react';


interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** Optional permission check: [module, action] */
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

  // Asset Management
  { label: 'Assets', icon: Package, path: '/assets', permission: ['assets', 'view'] },

  // Payroll
  { label: 'Payroll', icon: Wallet, path: '/payroll', permission: ['payroll', 'view'] },

  // Project Management
  { label: 'Projects', icon: FolderKanban, path: '/projects', permission: ['projects', 'view'] },

  // System
  { label: 'Chat', icon: MessageSquare, path: '/chat', permission: ['chat', 'view'] },

  // Settings / Activity
  { label: 'Activity', icon: Activity, path: '/activity', permission: ['audit_logs', 'view'] },

  // Roles & Permissions
  { label: 'Roles', icon: Shield, path: '/roles-permissions', permission: ['roles', 'manage'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { totalUnreadCount } = useChat();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (!user) return null;


  const visibleItems = NAV_ITEMS.filter(item => {
    // Super Admin only sees Dashboard, Tenants, and Plans
    if (user.role === 'SUPER_ADMIN') {
      const allowedPaths = ['/dashboard/system', '/tenants', '/plans', '/coupons'];
      return allowedPaths.includes(item.path);
    }

    // For items with a permission field
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

    // Role-based routing for Dashboards
    if (item.path.includes('/dashboard/')) {
      if (item.path === '/dashboard/system' && user.role === 'SUPER_ADMIN') return true;
      if (item.path === '/dashboard/organization' && user.role === 'ADMIN') return true;
      if (item.path === '/dashboard/hr' && user.role === 'HR') return true;
      if (item.path === '/dashboard/team' && user.role === 'MANAGER') return true;
      if (item.path === '/dashboard/personal' && (user.role === 'EMPLOYEE' || !['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN'].includes(user.role))) return true;
      return false;
    }

    // Super Admin specific items without explicit permission keys in master catalog
    const superAdminPaths = ['/tenants', '/plans', '/coupons'];
    if (superAdminPaths.includes(item.path)) {
      return user.role === 'SUPER_ADMIN';
    }

    // Default fallback for any unhandled public items
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