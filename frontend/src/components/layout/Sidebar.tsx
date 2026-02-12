import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/personal', roles: ['EMPLOYEE'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/team', roles: ['MANAGER'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/hr', roles: ['HR'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/organization', roles: ['ADMIN'] },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/system', roles: ['SUPER_ADMIN'] },
  { label: 'Tenants', icon: Building2, path: '/tenants', roles: ['SUPER_ADMIN'] },
  { label: 'Plans', icon: CreditCard, path: '/plans', roles: ['SUPER_ADMIN'] },
  { label: 'Employees', icon: Users, path: '/dashboard/employees', roles: ['ADMIN', 'HR', 'MANAGER'] },
  { label: 'Organisation', icon: Building2, path: '/organisation', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },

  { label: 'Attendance', icon: Clock, path: '/attendance', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Calendar', icon: CalendarRange, path: '/calendar', roles: ['HR', 'MANAGER', 'EMPLOYEE', 'ADMIN'] },
  { label: 'Leave', icon: Calendar, path: '/leave', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['ADMIN', 'HR'] },
  //{ label: 'Inbox', icon: Inbox, path: '/inbox', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },


  // Asset Management
  { label: 'Assets', icon: Package, path: '/assets', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },

  // Payroll
  { label: 'Payroll', icon: Wallet, path: '/Payroll', roles: ['HR', 'EMPLOYEE', 'MANAGER'] },

  // Project Management
  { label: 'Projects', icon: FolderKanban, path: '/projects', roles: ['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'] },
  //{ label: 'Clients', icon: Building2, path: '/projects/clients', roles: ['ADMIN', 'MANAGER', 'HR'] },

  // System
  { label: 'Chat', icon: MessageSquare, path: '/chat', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Activity', icon: Activity, path: '/activity', roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();
  const { pathname } = useLocation();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes(user.role)
  );

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
                {label}
              </span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};