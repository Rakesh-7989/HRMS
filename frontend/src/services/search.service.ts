import api from './api';

export interface SearchResult {
    id: string;
    type: 'employee' | 'asset' | 'project' | 'leave' | 'department' | 'page' | 'action';
    title: string;
    subtitle?: string;
    url: string;
    icon?: string;
    keywords?: string[];
}

export interface SearchResults {
    pages: SearchResult[];
    actions: SearchResult[];
    employees: SearchResult[];
    assets: SearchResult[];
    projects: SearchResult[];
    total: number;
}

// Static navigation items - modules and pages
const navigationItems: SearchResult[] = [
    // Dashboards
    { id: 'dashboard-org', type: 'page', title: 'Organization Dashboard', subtitle: 'Admin & HR overview', url: '/dashboard/organization', keywords: ['dashboard', 'admin', 'hr', 'organization', 'overview'] },
    { id: 'dashboard-team', type: 'page', title: 'Team Dashboard', subtitle: 'Manager view', url: '/dashboard/team', keywords: ['dashboard', 'manager', 'team'] },
    { id: 'dashboard-personal', type: 'page', title: 'Personal Dashboard', subtitle: 'My overview', url: '/dashboard/personal', keywords: ['dashboard', 'personal', 'my', 'employee'] },

    // Employees
    { id: 'employees', type: 'page', title: 'Employees', subtitle: 'View all employees', url: '/dashboard/employees', keywords: ['employees', 'staff', 'people', 'team', 'users'] },
    { id: 'profile', type: 'page', title: 'My Profile', subtitle: 'View and edit your profile', url: '/profile', keywords: ['profile', 'my', 'account', 'settings'] },

    // Attendance
    { id: 'attendance', type: 'page', title: 'Attendance', subtitle: 'Track attendance & clock in/out', url: '/attendance', keywords: ['attendance', 'clock', 'time', 'punch', 'checkin', 'checkout', 'present', 'absent'] },

    // Leave
    { id: 'leave', type: 'page', title: 'Leave Management', subtitle: 'Apply and manage leaves', url: '/leave', keywords: ['leave', 'vacation', 'holiday', 'time off', 'pto', 'sick', 'casual'] },
    { id: 'leave-settings', type: 'page', title: 'Leave Settings', subtitle: 'Configure leave policies', url: '/leave/settings', keywords: ['leave', 'settings', 'policy', 'configure'] },
    { id: 'holidays', type: 'page', title: 'Holidays', subtitle: 'Company holidays calendar', url: '/holidays', keywords: ['holidays', 'calendar', 'public holidays'] },

    // Organization
    { id: 'departments', type: 'page', title: 'Departments', subtitle: 'Manage departments', url: '/departments', keywords: ['departments', 'teams', 'divisions', 'organization'] },
    { id: 'designations', type: 'page', title: 'Designations', subtitle: 'Manage job titles', url: '/designations', keywords: ['designations', 'titles', 'positions', 'roles', 'job'] },
    { id: 'organisation', type: 'page', title: 'Organization Chart', subtitle: 'View org hierarchy', url: '/organisation', keywords: ['organization', 'chart', 'hierarchy', 'structure'] },

    // Assets
    { id: 'assets', type: 'page', title: 'Assets', subtitle: 'Manage company assets', url: '/assets', keywords: ['assets', 'equipment', 'laptop', 'inventory', 'devices'] },
    { id: 'asset-requests', type: 'page', title: 'Asset Requests', subtitle: 'View asset requests', url: '/assets/requests', keywords: ['asset', 'request', 'equipment'] },

    // Projects
    { id: 'projects', type: 'page', title: 'Projects', subtitle: 'Manage projects', url: '/projects', keywords: ['projects', 'work', 'tasks'] },
    { id: 'clients', type: 'page', title: 'Clients', subtitle: 'Manage clients', url: '/projects/clients', keywords: ['clients', 'customers', 'accounts'] },
    { id: 'project-reports', type: 'page', title: 'Project Reports', subtitle: 'View project analytics', url: '/projects/reports', keywords: ['project', 'reports', 'analytics'] },

    // Payroll
    { id: 'payroll', type: 'page', title: 'Payroll', subtitle: 'Salary and payslips', url: '/payroll', keywords: ['payroll', 'salary', 'payslip', 'wages', 'compensation'] },

    // Reports & Settings
    { id: 'reports', type: 'page', title: 'Reports', subtitle: 'View HR reports', url: '/reports', keywords: ['reports', 'analytics', 'statistics', 'data'] },
    { id: 'settings', type: 'page', title: 'Settings', subtitle: 'System settings', url: '/settings', keywords: ['settings', 'configuration', 'preferences', 'options'] },
    { id: 'activity', type: 'page', title: 'Activity Log', subtitle: 'View system activity', url: '/activity', keywords: ['activity', 'log', 'audit', 'history'] },
    { id: 'inbox', type: 'page', title: 'Inbox', subtitle: 'Messages and notifications', url: '/inbox', keywords: ['inbox', 'messages', 'notifications', 'mail'] },
];

// Quick actions
const quickActions: SearchResult[] = [
    { id: 'add-employee', type: 'action', title: 'Add New Employee', subtitle: 'Create a new employee record', url: '/employees/new', keywords: ['add', 'new', 'create', 'employee', 'hire'] },
    { id: 'add-asset', type: 'action', title: 'Add New Asset', subtitle: 'Register a new asset', url: '/assets/new', keywords: ['add', 'new', 'create', 'asset', 'equipment'] },
    { id: 'apply-leave', type: 'action', title: 'Apply for Leave', subtitle: 'Submit a leave request', url: '/leave', keywords: ['apply', 'leave', 'request', 'time off'] },
    { id: 'clock-in', type: 'action', title: 'Mark Attendance', subtitle: 'Clock in/out for today', url: '/attendance', keywords: ['clock', 'attendance', 'punch', 'checkin'] },
    { id: 'view-payslip', type: 'action', title: 'View Payslip', subtitle: 'Check your salary details', url: '/payroll', keywords: ['payslip', 'salary', 'wages'] },
];

export const searchService = {
    /**
     * Performs a global search across navigation, actions, and data
     */
    globalSearch: async (query: string): Promise<SearchResults> => {
        const results: SearchResults = {
            pages: [],
            actions: [],
            employees: [],
            assets: [],
            projects: [],
            total: 0,
        };

        if (!query || query.trim().length < 2) {
            return results;
        }

        const searchTerm = query.toLowerCase().trim();

        // Search navigation items
        results.pages = navigationItems.filter((item) => {
            const titleMatch = item.title.toLowerCase().includes(searchTerm);
            const subtitleMatch = item.subtitle?.toLowerCase().includes(searchTerm);
            const keywordMatch = item.keywords?.some((k) => k.includes(searchTerm));
            return titleMatch || subtitleMatch || keywordMatch;
        }).slice(0, 8);

        // Search quick actions
        results.actions = quickActions.filter((item) => {
            const titleMatch = item.title.toLowerCase().includes(searchTerm);
            const subtitleMatch = item.subtitle?.toLowerCase().includes(searchTerm);
            const keywordMatch = item.keywords?.some((k) => k.includes(searchTerm));
            return titleMatch || subtitleMatch || keywordMatch;
        }).slice(0, 5);

        try {
            // Search employees
            const usersResponse = await api.get('/users', {
                params: { search: searchTerm },
            });
            const users = usersResponse.data?.users || [];
            results.employees = users.slice(0, 8).map((user: Record<string, unknown>) => ({
                id: user.id as string,
                type: 'employee' as const,
                title: `${(user.first_name as string) || ''} ${(user.last_name as string) || ''}`.trim() || (user.email as string),
                subtitle: `${user.role} • ${user.email}`,
                url: `/employees/${user.id}`,
            }));

            // Search assets
            try {
                const assetsResponse = await api.get('/assets');
                const assets = assetsResponse.data?.assets || assetsResponse.data || [];
                const filteredAssets = assets.filter((asset: Record<string, unknown>) =>
                    (asset.name as string)?.toLowerCase().includes(searchTerm) ||
                    (asset.asset_code as string)?.toLowerCase().includes(searchTerm) ||
                    (asset.category as string)?.toLowerCase().includes(searchTerm)
                );
                results.assets = filteredAssets.slice(0, 8).map((asset: Record<string, unknown>) => ({
                    id: asset.id as string,
                    type: 'asset' as const,
                    title: asset.name as string,
                    subtitle: `${asset.category} • ${asset.status}`,
                    url: `/assets/${asset.id}`,
                }));
            } catch {
                // Assets endpoint may not be accessible for all roles
            }

            // Search projects
            try {
                const projectsResponse = await api.get('/projects');
                const projects = projectsResponse.data?.projects || projectsResponse.data?.data || [];
                const filteredProjects = projects.filter((project: Record<string, unknown>) =>
                    (project.name as string)?.toLowerCase().includes(searchTerm) ||
                    (project.description as string)?.toLowerCase().includes(searchTerm)
                );
                results.projects = filteredProjects.slice(0, 8).map((project: Record<string, unknown>) => ({
                    id: project.id as string,
                    type: 'project' as const,
                    title: project.name as string,
                    subtitle: `${project.status || 'Active'} • ${(project.client_name as string) || 'No client'}`,
                    url: `/projects/${project.id}`,
                }));
            } catch {
                // Projects endpoint may not be accessible for all roles
            }

            results.total =
                results.pages.length +
                results.actions.length +
                results.employees.length +
                results.assets.length +
                results.projects.length;

            return results;
        } catch (error) {
            console.error('Search error:', error);
            // Still return pages and actions even if API calls fail
            results.total = results.pages.length + results.actions.length;
            return results;
        }
    },
};

export default searchService;
