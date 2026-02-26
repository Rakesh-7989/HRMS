import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { searchService, SearchResult, SearchResults } from '@/services/common/search.service';
import {
    Search,
    User,
    Package,
    Briefcase,
    Loader2,
    ArrowRight,
    X,
    FileText,
    Zap,
    LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export const SearchPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            if (query.trim()) {
                setSearchParams({ q: query.trim() });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, setSearchParams]);

    // Search query
    const { data: results, isLoading, isFetching } = useQuery<SearchResults>({
        queryKey: ['global-search', debouncedQuery],
        queryFn: () => searchService.globalSearch(debouncedQuery),
        enabled: debouncedQuery.length >= 2,
        staleTime: 60000, // Cache for 1 minute
    });

    const handleResultClick = useCallback((result: SearchResult) => {
        navigate(result.url);
    }, [navigate]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'employee':
                return <User size={18} className="text-blue-500" />;
            case 'asset':
                return <Package size={18} className="text-green-500" />;
            case 'project':
                return <Briefcase size={18} className="text-purple-500" />;
            case 'page':
                return <LayoutDashboard size={18} className="text-indigo-500" />;
            case 'action':
                return <Zap size={18} className="text-amber-500" />;
            default:
                return <FileText size={18} className="text-gray-500" />;
        }
    };

    const getCategoryLabel = (type: string) => {
        switch (type) {
            case 'employee':
                return 'Employees';
            case 'asset':
                return 'Assets';
            case 'project':
                return 'Projects';
            case 'page':
                return 'Pages & Modules';
            case 'action':
                return 'Quick Actions';
            default:
                return 'Results';
        }
    };

    const getCategoryColor = (type: string) => {
        switch (type) {
            case 'page':
                return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
            case 'action':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
            default:
                return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const renderResultSection = (items: SearchResult[], type: string) => {
        if (!items || items.length === 0) return null;

        return (
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {getIcon(type)}
                    {getCategoryLabel(type)} ({items.length})
                </h3>
                <div className={cn(
                    "space-y-2",
                    type === 'action' && "grid grid-cols-1 md:grid-cols-2 gap-2 space-y-0"
                )}>
                    {items.map((result) => (
                        <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className={cn(
                                "w-full text-left p-4 rounded-lg border transition-all duration-200 group",
                                getCategoryColor(result.type),
                                "hover:border-primary hover:shadow-md"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        result.type === 'page' && "bg-indigo-100 dark:bg-indigo-800",
                                        result.type === 'action' && "bg-amber-100 dark:bg-amber-800",
                                        result.type === 'employee' && "bg-blue-100 dark:bg-blue-800",
                                        result.type === 'asset' && "bg-green-100 dark:bg-green-800",
                                        result.type === 'project' && "bg-purple-100 dark:bg-purple-800"
                                    )}>
                                        {getIcon(result.type)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary">
                                            {result.title}
                                        </p>
                                        {result.subtitle && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight
                                    size={16}
                                    className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all"
                                />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const hasResults = results && results.total > 0;
    const showEmptyState = debouncedQuery.length >= 2 && !isLoading && !hasResults;

    return (
        <DashboardLayout
            title="Search"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard/organization' },
                { label: 'Search' },
            ]}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Search Input */}
                <Card className="p-6">
                    <div className="relative">
                        <Search
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search pages, actions, employees, assets, projects..."
                            autoFocus
                            className="w-full pl-12 pr-12 py-4 text-lg rounded-xl border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-primary focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setDebouncedQuery('');
                                    setSearchParams({});
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full 
                         hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                        {isFetching && (
                            <Loader2
                                size={20}
                                className="absolute right-12 top-1/2 -translate-y-1/2 text-primary animate-spin"
                            />
                        )}
                    </div>

                    {/* Quick suggestions */}
                    {!query && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                                Try searching for:
                            </p>
                            {['Attendance', 'Leave', 'Payroll', 'Add Employee', 'Reports'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setQuery(suggestion.toLowerCase())}
                                    className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-700 
                           text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Results */}
                {isLoading && debouncedQuery.length >= 2 && (
                    <Card className="p-12">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                            <Loader2 size={40} className="animate-spin mb-4 text-primary" />
                            <p>Searching...</p>
                        </div>
                    </Card>
                )}

                {hasResults && (
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Found {results.total} result{results.total !== 1 ? 's' : ''} for "{debouncedQuery}"
                        </p>
                        {/* Pages and Actions first (most relevant for navigation) */}
                        {renderResultSection(results.pages, 'page')}
                        {renderResultSection(results.actions, 'action')}
                        {/* Then data results */}
                        {renderResultSection(results.employees, 'employee')}
                        {renderResultSection(results.assets, 'asset')}
                        {renderResultSection(results.projects, 'project')}
                    </div>
                )}

                {showEmptyState && (
                    <Card className="p-12">
                        <div className="text-center">
                            <Search size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No results found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                No matches found for "{debouncedQuery}". Try a different search term.
                            </p>
                        </div>
                    </Card>
                )}

                {!debouncedQuery && (
                    <Card className="p-12">
                        <div className="text-center">
                            <Search size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Global Search
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                Search across pages, modules, quick actions, employees, assets, and projects.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                                <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded">Pages</span>
                                <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded">Actions</span>
                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">Employees</span>
                                <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded">Assets</span>
                                <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded">Projects</span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SearchPage;
