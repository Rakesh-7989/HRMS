import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { resolveImageUrl } from '@/utils/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Search, User, Package, Briefcase, LayoutDashboard, Zap, Loader2, Menu, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService, SearchResult } from '@/services/search.service';
import { NotificationDropdown } from './NotificationDropdown';
import { NavbarClock } from './NavbarClock';
import { ProfileDropdown } from './ProfileDropdown';
import { useChat } from '@/contexts/ChatContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  breadcrumbs,
  actions
}) => {
  const { user, hasActivePlan } = useAuth();
  const { myStatus } = useChat();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Set initial direction based on language
  useEffect(() => {
    document.dir = i18n.language?.startsWith('ar') ? 'rtl' : 'ltr';
  }, [i18n.language]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // const canAccessSettings =
  //   user?.role === 'ADMIN' ||
  //   user?.role === 'HR' ||
  //   user?.role === 'SUPER_ADMIN';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['header-search', debouncedQuery],
    queryFn: () => searchService.globalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    let results = [
      ...searchResults.pages,
      ...searchResults.actions,
      ...searchResults.employees.slice(0, 3),
      ...searchResults.assets.slice(0, 3),
      ...searchResults.projects.slice(0, 3),
    ];

    // Filter out settings for managers
    if (user?.role === 'MANAGER') {
      results = results.filter(r =>
        !r.url.startsWith('/settings') &&
        !r.url.startsWith('/leave/settings')
      );
    }

    // Filter out results if no active plan
    if (!hasActivePlan && user?.role !== 'SUPER_ADMIN') {
      const restrictedPrefixes = ['/payroll', '/attendance', '/leave', '/assets', '/projects', '/wfh', '/chat'];
      results = results.filter(r =>
        !restrictedPrefixes.some(prefix => r.url.startsWith(prefix))
      );
    }

    return results.slice(0, 10);
  }, [searchResults, user?.role, hasActivePlan]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleResultClick(flatResults[selectedIndex]);
      } else if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'employee':
        return <User size={14} className="text-blue-500" />;
      case 'asset':
        return <Package size={14} className="text-green-500" />;
      case 'project':
        return <Briefcase size={14} className="text-purple-500" />;
      case 'page':
        return <LayoutDashboard size={14} className="text-indigo-500" />;
      case 'action':
        return <Zap size={14} className="text-amber-500" />;
      default:
        return <Search size={14} className="text-gray-500" />;
    }
  };

  const hasSuggestions = flatResults.length > 0;

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main wrapper */}
      <div className="flex flex-col flex-1 ml-0 md:ml-[90px] min-w-0">

        {/* Header */}
        <header
          className="sticky top-0 z-30 min-h-16 border-b px-4 md:px-6 flex items-center py-2 transition-all"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between w-full gap-2">

            {/* LEFT: Title + Breadcrumbs */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="md:hidden text-gray-500 hover:text-primary transition-colors focus:outline-none shrink-0"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white leading-snug truncate md:text-clip">
                  {title === 'Dashboard' ? t('common.dashboard') : (title || t('common.dashboard'))}
                </h1>

                {breadcrumbs && breadcrumbs.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full">
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb.label}>
                        {idx > 0 && <span>/</span>}
                        {crumb.href ? (
                          <a
                            href={crumb.href}
                            className="hover:text-primary transition-colors truncate"
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {crumb.label}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-1.5 md:gap-3">
              <NavbarClock />
              {actions && (
                <div className="flex items-center gap-2 mr-2">
                  {actions}
                </div>
              )}

              {/* Search with Suggestions */}
              <div
                className={cn(
                  "relative hidden md:block transition-all duration-300 ease-in-out",
                  isSearchExpanded ? "w-64" : "w-10"
                )}
                ref={searchRef}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isSearchExpanded) {
                      setIsSearchExpanded(true);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    } else {
                      const q = searchQuery.trim();
                      if (q) {
                        navigate(`/search?q=${encodeURIComponent(q)}`);
                        setShowSuggestions(false);
                      }
                    }
                  }}
                  aria-label="Search"
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10",
                    isSearchExpanded ? "left-1 text-gray-500" : "left-1 text-gray-500"
                  )}
                >
                  <Search size={18} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => {
                    setIsSearchExpanded(true);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    // Delay closing to allow clicking on suggestions
                    // Handled by click outside listener
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "pl-10 pr-4 py-2 h-10 text-sm rounded-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "transition-all duration-300 ease-in-out block",
                    isSearchExpanded ? "w-full opacity-100" : "w-0 opacity-0 p-0 overflow-hidden"
                  )}
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && searchQuery.length >= 2 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                  >
                    {isSearching && (
                      <div className="px-4 py-3 flex items-center gap-2 text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">{t('common.searching')}</span>
                      </div>
                    )}

                    {!isSearching && hasSuggestions && (
                      <>
                        {flatResults.map((result, index) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                              }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              {getIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </p>
                              {result.subtitle && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 capitalize flex-shrink-0">
                              {result.type}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-center px-4 py-2.5 text-sm text-primary hover:bg-primary/10 border-t border-gray-100 dark:border-gray-800"
                        >
                          {t('common.viewAllResults', { query: searchQuery })}
                        </button>
                      </>
                    )}

                    {!isSearching && !hasSuggestions && debouncedQuery.length >= 2 && (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No results found for "{debouncedQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              <LanguageSwitcher />
              <ThemeToggle />

              {/* Notifications */}
              {/* Notifications */}
              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onToggle={() => setIsNotificationOpen(!isNotificationOpen)}
              />

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((p) => !p)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative group"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white overflow-hidden shadow-sm border-2 border-transparent group-hover:border-primary/20 transition-all">
                      {user?.profile_photo_url ? (
                        <img src={resolveImageUrl(user.profile_photo_url)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.first_name?.charAt(0) || 'U'
                      )}
                    </div>
                    {/* Status Dot on Trigger */}
                    <div
                      title={myStatus === 'dnd' ? 'Do not disturb' : (myStatus ? myStatus.charAt(0).toUpperCase() + myStatus.slice(1) : 'Available')}
                      className={cn(
                        "absolute -bottom-0.5 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 shadow-sm cursor-help flex items-center justify-center",
                        myStatus === 'available' ? "bg-green-500" :
                          myStatus === 'dnd' ? "bg-red-500" :
                            myStatus === 'busy' ? "bg-red-500" :
                              myStatus === 'away' ? "bg-amber-500" : "bg-gray-400 dark:bg-gray-600"
                      )}
                    >
                      {myStatus === 'offline' && <div className="h-1 w-1 rounded-full bg-white dark:bg-gray-900" />}
                      {myStatus === 'dnd' && <div className="w-2 h-0.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <div className="hidden sm:block text-left leading-tight ml-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {user?.first_name}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {user?.role}
                    </p>
                  </div>
                </button>

                {profileOpen && (
                  <ProfileDropdown onClose={() => setProfileOpen(false)} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Subscription Warning Banner */}
        {/* Subscription Warning Banner */}
        {!hasActivePlan && user?.role !== 'SUPER_ADMIN' && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                {user?.role === 'ADMIN'
                  ? t('common.restoreAccess')
                  : t('common.restrictedFeature')}
              </span>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => navigate('/pricing')}
                className="bg-white text-amber-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors shadow-sm"
              >
                {t('common.upgradePlan')}
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        <main className="p-4 md:p-6 flex-1 overflow-auto overscroll-contain flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
