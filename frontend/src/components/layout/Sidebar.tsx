import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Inbox,
  Building2,
  BarChart3,
  Wallet,
  Package,
  FolderKanban,
  Activity,
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
  { label: 'Employees', icon: Users, path: '/employees', roles: ['ADMIN', 'HR', 'MANAGER'] },
  { label: 'Organisation', icon: Building2, path: '/organisation', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SUPER_ADMIN'] },

  { label: 'Attendance', icon: Clock, path: '/attendance', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Leave', icon: Calendar, path: '/leave', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['ADMIN', 'HR'] },
  { label: 'Inbox', icon: Inbox, path: '/inbox', roles: ['HR', 'MANAGER', 'EMPLOYEE'] },


  // Asset Management
  { label: 'Assets', icon: Package, path: '/assets', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },

  // Payroll
  { label: 'Payroll', icon: Wallet, path: '/Payroll', roles: ['HR', 'EMPLOYEE', 'MANAGER'] },

  // Project Management
  { label: 'Projects', icon: FolderKanban, path: '/projects', roles: ['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'] },

  // System
  { label: 'Activity', icon: Activity, path: '/activity', roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
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

      <aside className="fixed inset-y-0 left-0 w-[90px] bg-primary-gradient text-white flex flex-col items-center z-40">
        {/* Logo */}
        <div
          className="relative h-16 w-full flex items-center justify-center
             border-b border-white/10
             bg-primary-gradient
             shadow-sm"
        >
          <span className="text-white font-semibold text-lg tracking-widest">
            GZ
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full py-4 flex flex-col items-center gap-1 overflow-y-auto sidebar-scroll">
          {visibleItems.map(({ path, label, icon: Icon }, index) => (
            <Link
              key={`${path}-${index}`}
              to={path}
              className={cn(
                'w-full flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                isActive(path)
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={20} />
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