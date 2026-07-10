const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Payroll tabs and common
enData.payroll = {
    ...(enData.payroll || {}),
    payrollManagement: "Payroll Management",
    overview: "Overview",
    summary: "Summary",
    payslips: "Payslips",
    taxAndCompliance: "Tax & Compliance",
    salaryStructure: "Salary Structure",
    arrears: "Arrears",
    fnfSettlements: "F&F Settlements",
    payRun: "Pay Run",
    runPayroll: "Run Payroll"
};

teData.payroll = {
    ...(teData.payroll || {}),
    payrollManagement: "పేరోల్ నిర్వహణ",
    overview: "అవలోకనం",
    summary: "సారాంశం",
    payslips: "పేస్లిప్‌లు",
    taxAndCompliance: "పన్ను & సమ్మతి",
    salaryStructure: "జీతం నిర్మాణం",
    arrears: "బకాయిలు",
    fnfSettlements: "F&F సెటిల్మెంట్లు",
    payRun: "పే రన్",
    runPayroll: "పేరోల్ రన్ చేయండి"
};

// Assets
enData.assets = {
    ...(enData.assets || {}),
    assetManagement: "Asset Management",
    myAssets: "My Assets",
    totalAssets: "Total Assets",
    available: "Available",
    assigned: "Assigned",
    underRepair: "Under Repair",
    request: "Request",
    searchPlaceholder: "Search by asset name, code, barcode...",
    allStatus: "All Status",
    allCategories: "All Categories",
    exportCSV: "Export CSV",
    assign: "Assign",
    requests: "Requests",
    myRequests: "My Requests",
    noAssetsFound: "No assets found",
    noAssetsAssigned: "No assets assigned to you"
};

teData.assets = {
    ...(teData.assets || {}),
    assetManagement: "ఆస్తుల నిర్వహణ",
    myAssets: "నా ఆస్తులు",
    totalAssets: "మొత్తం ఆస్తులు",
    available: "అందుబాటులో ఉంది",
    assigned: "కేటాయించబడింది",
    underRepair: "మరమ్మత్తులో ఉంది",
    request: "అభ్యర్థన",
    searchPlaceholder: "ఆస్తి పేరు, కోడ్, బార్‌కోడ్ ద్వారా శోధించండి...",
    allStatus: "అన్ని స్థితులు",
    allCategories: "అన్ని వర్గాలు",
    exportCSV: "CSV ఎగుమతి",
    assign: "కేటాయించు",
    requests: "అభ్యర్థనలు",
    myRequests: "నా అభ్యర్థనలు",
    noAssetsFound: "ఆస్తులు కనుగొనబడలేదు",
    noAssetsAssigned: "మీకు ఆస్తులు కేటాయించబడలేదు"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Added specific requested strings to translation files for Payroll and Assets.');
