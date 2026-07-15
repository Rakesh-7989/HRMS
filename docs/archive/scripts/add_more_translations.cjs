const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Reports translations
enData.reports = {
    ...(enData.reports || {}),
    totalEmployees: "Total Employees",
    active: "active",
    departments: "Departments",
    designations: "designations",
    leaveRequests: "Leave Requests",
    pending: "pending",
    attendanceRate: "Attendance Rate",
    roleDistribution: "Role Distribution",
    departmentHeadcount: "Department Headcount",
    attendanceTrendAnalysis: "Attendance Trend Analysis",
    leaveTypeDistribution: "Leave Type Distribution",
    departmentPerformance: "Department Performance",
    employees: "Employees",
    monthlyTrends: "Monthly Trends",
    last7Days: "Last 7 days",
    last90Days: "Last 90 days",
    custom: "Custom"
};

teData.reports = {
    ...(teData.reports || {}),
    totalEmployees: "మొత్తం ఉద్యోగులు",
    active: "సక్రియంగా",
    departments: "విభాగాలు",
    designations: "హోదాలు",
    leaveRequests: "సెలవు అభ్యర్థనలు",
    pending: "పెండింగ్",
    attendanceRate: "హాజరు రేటు",
    roleDistribution: "పాత్ర పంపిణీ",
    departmentHeadcount: "విభాగం ఉద్యోగుల సంఖ్య",
    attendanceTrendAnalysis: "హాజరు ట్రెండ్ విశ్లేషణ",
    leaveTypeDistribution: "సెలవు రకం పంపిణీ",
    departmentPerformance: "విభాగం పనితీరు",
    employees: "ఉద్యోగులు",
    monthlyTrends: "నెలవారీ పోకడలు",
    last7Days: "గత 7 రోజులు",
    last90Days: "గత 90 రోజులు",
    custom: "అనుకూల"
};

// Apply Assets Table Headers
enData.assets = {
    ...(enData.assets || {}),
    asset: "Asset",
    barcode: "Barcode",
    category: "Category",
    status: "Status",
    assignedTo: "Assigned To",
    assignedBy: "Assigned By",
    assignedDate: "Assigned Date",
    lastUpdated: "Last Updated",
    actions: "Actions"
};

teData.assets = {
    ...(teData.assets || {}),
    asset: "ఆస్తి",
    barcode: "బార్‌కోడ్",
    category: "వర్గం",
    status: "స్థితి",
    assignedTo: "కేటాయించబడిన వారు",
    assignedBy: "కేటాయించిన వారు",
    assignedDate: "కేటాయించిన తేదీ",
    lastUpdated: "చివరిగా నవీకరించబడింది",
    actions: "చర్యలు"
};

// Apply Payroll Strings
enData.payroll = {
    ...(enData.payroll || {}),
    totalCostToCompany: "Total Cost to Company",
    totalNetPayout: "Total Net Payout",
    bankTransferAmount: "Bank transfer amount",
    totalDeductions: "Total Deductions",
    pfEsiPtTds: "PF + ESI + PT + TDS",
    taxDeductedTds: "Tax Deducted (TDS)",
    incomeTaxWithheld: "Income tax withheld",
    employeesCount: "employees"
};

teData.payroll = {
    ...(teData.payroll || {}),
    totalCostToCompany: "కంపెనీకి మొత్తం ఖర్చు",
    totalNetPayout: "మొత్తం నికర చెల్లింపు",
    bankTransferAmount: "బ్యాంకు బదిలీ మొత్తం",
    totalDeductions: "మొత్తం తగ్గింపులు",
    pfEsiPtTds: "PF + ESI + PT + TDS",
    taxDeductedTds: "తగ్గించబడిన పన్ను (TDS)",
    incomeTaxWithheld: "నిలిపి ఉంచబడిన ఆదాయపు పన్ను",
    employeesCount: "ఉద్యోగులు"
};

// Apply roles in common
enData.common = {
    ...(enData.common || {}),
    roleEmployee: "EMPLOYEE",
    roleManager: "MANAGER",
    roleHr: "HR",
    roleAdmin: "ADMIN"
};

teData.common = {
    ...(teData.common || {}),
    roleEmployee: "ఉద్యోగి",
    roleManager: "మేనేజర్",
    roleHr: "HR",
    roleAdmin: "నిర్వాహకుడు"
};


fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added custom translations.');
