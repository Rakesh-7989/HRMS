const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, 'src');

// Get all tsx files under pages/ that don't have useTranslation
function getAllPageFiles(dir, results = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            getAllPageFiles(full, results);
        } else if (item.endsWith('.tsx') && !item.includes('DBADashboard') && !item.startsWith('test')) {
            const content = fs.readFileSync(full, 'utf-8');
            if (!content.includes('useTranslation')) {
                results.push(full);
            }
        }
    }
    return results;
}

const files = getAllPageFiles(path.join(BASE, 'pages'));
console.log(`Found ${files.length} files needing translation:\n`);

// Common replacements
const replacements = [
    // DashboardLayout title attributes
    [/title="Dashboard"/g, "title={t('common.dashboard')}"],
    [/title="Settings"/g, "title={t('settings.title')}"],
    [/title="Employees"/g, "title={t('employees.title')}"],
    [/title="Attendance"/g, "title={t('attendance.title')}"],
    [/title="Leave Management"/g, "title={t('leave.title')}"],
    [/title="Calendar"/g, "title={t('calendar.title')}"],
    [/title="Reports"/g, "title={t('reports.title')}"],
    [/title="Assets"/g, "title={t('assets.title')}"],
    [/title="Payroll"/g, "title={t('payroll.title')}"],
    [/title="Projects"/g, "title={t('projects.title')}"],
    [/title="Notifications"/g, "title={t('notifications.title')}"],
    [/title="Organisation"/g, "title={t('organisation.title')}"],
    [/title="Billing"/g, "title={t('billing.title')}"],
    [/title="Expenses"/g, "title={t('expenses.title')}"],
    [/title="Loans"/g, "title={t('loans.title')}"],
    [/title="Activity"/g, "title={t('activity.title')}"],
    [/title="Audit Activity"/g, "title={t('activity.title')}"],
    [/title="Holidays"/g, "title={t('calendar.holidays')}"],
    [/title="Departments"/g, "title={t('organisation.departments')}"],
    [/title="Designations"/g, "title={t('organisation.designations')}"],
    [/title="My Profile"/g, "title={t('profile.title')}"],
    [/title="Chat"/g, "title={t('sidebar.chat')}"],
    [/title="Add Employee"/g, "title={t('employees.addEmployee')}"],
    [/title="Edit Employee"/g, "title={t('employees.editEmployee')}"],
    [/title="Employee Details"/g, "title={t('employees.employeeDetails')}"],
    [/title="Add Asset"/g, "title={t('assets.addAsset')}"],
    [/title="Asset Details"/g, "title={t('assets.assetDetails')}"],
    [/title="Salary Details"/g, "title={t('payroll.salaryDetails')}"],
    [/title="Payslips"/g, "title={t('payroll.payslips')}"],
    [/title="Leave Settings"/g, "title={t('leave.tabs.settings')}"],
    [/title="Leave Balances"/g, "title={t('leave.tabs.balances')}"],
    [/title="Subscription"/g, "title={t('billing.subscription')}"],
    [/title="Search"/g, "title={t('common.search')}"],
    [/title="Inbox"/g, "title={t('sidebar.inbox')}"],
    [/title="Plans"/g, "title={t('sidebar.plans')}"],
    [/title="Tenants"/g, "title={t('sidebar.tenants')}"],
    [/title="Register"/g, "title={t('auth.register')}"],
    [/title="Forgot Password"/g, "title={t('auth.forgotPassword')}"],
    [/title="Reset Password"/g, "title={t('auth.resetPassword')}"],
    [/title="Change Password"/g, "title={t('auth.changePassword')}"],
    [/title="Cost Centers"/g, "title={t('organisation.costCenters')}"],
    [/title="Asset Requests"/g, "title={t('assets.assetRequests')}"],

    // Breadcrumb labels
    [/label: 'Dashboard'/g, "label: t('common.breadcrumbs.dashboard')"],
    [/label: 'Attendance'/g, "label: t('common.breadcrumbs.attendance')"],
    [/label: 'Leave'/g, "label: t('common.breadcrumbs.leave')"],
    [/label: 'Employees'/g, "label: t('common.breadcrumbs.employees')"],
    [/label: 'Settings'/g, "label: t('common.breadcrumbs.settings')"],
    [/label: 'Reports'/g, "label: t('common.breadcrumbs.reports')"],
    [/label: 'Projects'/g, "label: t('common.breadcrumbs.projects')"],
    [/label: 'Payroll'/g, "label: t('common.breadcrumbs.payroll')"],
    [/label: 'Assets'/g, "label: t('common.breadcrumbs.assets')"],
    [/label: 'Calendar'/g, "label: t('common.breadcrumbs.calendar')"],
    [/label: 'Chat'/g, "label: t('common.breadcrumbs.chat')"],
    [/label: 'Organisation'/g, "label: t('common.breadcrumbs.organisation')"],
    [/label: 'Profile'/g, "label: t('common.breadcrumbs.profile')"],

    // Common button/label texts (between > and <)
    [/>Save Changes</g, ">{t('settings.saveChanges')}<"],
    [/>Save<\//g, ">{t('common.save')}</"],
    [/>Cancel<\//g, ">{t('common.cancel')}</"],
    [/>Delete<\//g, ">{t('common.delete')}</"],
    [/>Update<\//g, ">{t('common.update')}</"],
    [/>Submit<\//g, ">{t('common.submit')}</"],
    [/>Close<\//g, ">{t('common.close')}</"],
    [/>Loading\.\.\.<\//g, ">{t('common.loading')}</"],
    [/>Refresh<\//g, ">{t('common.refresh')}</"],
    [/>Export<\//g, ">{t('common.export')}</"],
    [/>Download<\//g, ">{t('common.download')}</"],
    [/>Add Employee<\//g, ">{t('employees.addEmployee')}</"],

    // Search placeholder
    [/placeholder="Search\.\.\."/g, "placeholder={t('common.searchPlaceholder')}"],
];

let processed = 0;

for (const filePath of files) {
    const relPath = path.relative(BASE, filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Step 1: Add import
    const lines = content.split(/\r?\n/);
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import\s/)) {
            lastImportLine = i;
        }
    }

    if (lastImportLine >= 0) {
        lines.splice(lastImportLine + 1, 0, "import { useTranslation } from 'react-i18next';");
        content = lines.join('\r\n');
        modified = true;
    }

    // Step 2: Add hook call
    // Look for main component function
    const hookPatterns = [
        /(export\s+(?:const|function)\s+\w+(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*\([^)]*\)\s*=>\s*\{)/,
        /(export\s+(?:const|function)\s+\w+\s*=\s*\(\)\s*=>\s*\{)/,
        /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/,
    ];

    let hookAdded = false;
    for (const pattern of hookPatterns) {
        const m = content.match(pattern);
        if (m) {
            const insertAfter = m[0];
            // Make sure we don't add it twice
            const afterIdx = content.indexOf(insertAfter) + insertAfter.length;
            const nextChunk = content.slice(afterIdx, afterIdx + 300);
            if (!nextChunk.includes('useTranslation')) {
                content = content.replace(insertAfter, insertAfter + "\r\n  const { t } = useTranslation();");
                modified = true;
                hookAdded = true;
            }
            break;
        }
    }

    // Step 3: Apply replacements
    for (const [regex, replacement] of replacements) {
        const newContent = content.replace(regex, replacement);
        if (newContent !== content) {
            content = newContent;
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`DONE: ${relPath}` + (hookAdded ? ' (hook added)' : ' (import only)'));
        processed++;
    } else {
        console.log(`NO-CHANGE: ${relPath}`);
    }
}

console.log(`\nTotal processed: ${processed} / ${files.length}`);
