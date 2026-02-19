-- ===================================================================
-- Migration: Add Executive & Management Permissions
-- Date: 2026-02-19
-- Description: Adds ~35 new granular permissions for executive,
--              finance, people, compliance, technical & team categories.
--              Roles can be assigned these permissions via the admin UI.
-- ===================================================================

INSERT INTO permissions (name, category, description, resource, action) VALUES

-- Executive Dashboard & Analytics
('view_executive_dashboard',    'executive', 'View executive-level dashboard with KPIs', 'dashboard', 'read'),
('view_workforce_analytics',    'executive', 'View headcount, turnover and diversity metrics', 'analytics', 'read'),
('view_compensation_analytics', 'executive', 'View salary benchmarks and pay equity analysis', 'analytics', 'read'),
('view_attrition_reports',      'executive', 'View attrition and retention analytics', 'analytics', 'read'),
('view_hiring_analytics',       'executive', 'View recruitment pipeline and cost-per-hire', 'analytics', 'read'),

-- Finance & Budget
('view_payroll_summary',        'finance', 'View aggregated payroll costs (not individual)', 'payroll', 'read'),
('approve_budget',              'finance', 'Approve department and project budgets', 'budget', 'approve'),
('view_cost_center_reports',    'finance', 'View cost center expense breakdowns', 'report', 'read'),
('manage_salary_structures',    'finance', 'Edit salary grades, bands and CTC structures', 'payroll', 'manage'),
('approve_salary_revisions',    'finance', 'Approve salary revisions and increments', 'payroll', 'approve'),

-- People & Talent Management
('manage_org_policies',         'people', 'Create and edit company-wide HR policies', 'policy', 'manage'),
('manage_performance_cycles',   'people', 'Set up appraisal cycles and review templates', 'performance', 'manage'),
('view_performance_reviews',    'people', 'View all employee performance reviews', 'performance', 'read'),
('approve_termination',         'people', 'Approve employee termination requests', 'employee', 'approve'),
('manage_onboarding',           'people', 'Configure onboarding workflows', 'onboarding', 'manage'),
('manage_offboarding',          'people', 'Configure offboarding and exit workflows', 'offboarding', 'manage'),
('view_employee_satisfaction',  'people', 'View engagement and satisfaction survey results', 'survey', 'read'),

-- Organisation & Strategy
('manage_org_hierarchy',        'organisation', 'Create and modify the org hierarchy positions', 'organization', 'manage'),
('approve_department_creation', 'organisation', 'Approve new department creation requests', 'department', 'approve'),
('manage_company_announcements','organisation', 'Post company-wide announcements', 'announcement', 'manage'),
('view_all_projects_summary',   'organisation', 'View high-level project portfolio dashboard', 'project', 'read'),
('manage_company_goals',        'organisation', 'Set and manage company-level OKRs and goals', 'goal', 'manage'),

-- Compliance & Governance
('view_compliance_reports',     'compliance', 'View statutory and regulatory compliance status', 'compliance', 'read'),
('manage_data_privacy',         'compliance', 'Manage data privacy settings (GDPR/DPDP)', 'privacy', 'manage'),
('export_employee_data',        'compliance', 'Bulk export sensitive employee data', 'employee', 'export'),
('view_security_logs',          'compliance', 'View login and security audit logs', 'audit', 'read'),

-- Technical & IT Admin
('manage_system_config',        'technical', 'Configure system-level settings', 'system', 'manage'),
('manage_api_keys',             'technical', 'Manage API keys and webhook configurations', 'api', 'manage'),
('view_system_health',          'technical', 'View system uptime and performance metrics', 'system', 'read'),

-- Team Management
('approve_team_leave',          'team', 'Approve leave for direct reports', 'leave', 'approve'),
('approve_team_attendance',     'team', 'Approve attendance regularization for team', 'attendance', 'approve'),
('view_team_performance',       'team', 'View direct reports performance data', 'performance', 'read'),
('manage_team_shifts',          'team', 'Assign and manage team shift schedules', 'shift', 'manage'),
('approve_team_asset_requests', 'team', 'Approve asset requests from team members', 'asset', 'approve')

ON CONFLICT (name) DO NOTHING;
