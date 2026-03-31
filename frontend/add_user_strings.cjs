const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Calendar
enData.calendar = {
    ...(enData.calendar || {}),
    corporateCalendar: "Corporate Calendar",
    description: "Track national, regional, and company holidays with high precision."
};

teData.calendar = {
    ...(teData.calendar || {}),
    corporateCalendar: "కార్పొరేట్ క్యాలెండర్",
    description: "జాతీయ, ప్రాంతీయ మరియు సంస్థ సెలవులను అధిక ఖచ్చితత్వంతో ట్రాక్ చేయండి."
};

// Reports
enData.reports = {
    ...(enData.reports || {}),
    title: "Reports",
    reportsAndAnalytics: "Reports & Analytics",
    description: "Comprehensive insights into your organization's HR data",
    overview: "Overview",
    attendance: "Attendance",
    leave: "Leave",
    employee: "Employee",
    last30Days: "Last 30 days"
};

teData.reports = {
    ...(teData.reports || {}),
    title: "నివేదికలు",
    reportsAndAnalytics: "నివేదికలు & విశ్లేషణలు",
    description: "మీ సంస్థ యొక్క HR డేటాపై సమగ్ర అవగాహన",
    overview: "అవలోకనం",
    attendance: "హాజరు",
    leave: "సెలవు",
    employee: "ఉద్యోగి",
    last30Days: "గత 30 రోజులు"
};

// More Organisation missing keys
enData.organisation = {
    ...(enData.organisation || {}),
    employeeDirectory: "Employee Directory",
    organizationTree: "Organization Tree",
    departments: "Departments",
    designations: "Designations",
    shifts: "Shifts",
    allDepartments: "All Departments",
    filterByDept: "Filter by Department:"
};

teData.organisation = {
    ...(teData.organisation || {}),
    employeeDirectory: "ఉద్యోగుల డైరెక్టరీ",
    organizationTree: "సంస్థ వృక్షం",
    departments: "విభాగాలు",
    designations: "హోదాలు",
    shifts: "షిఫ్టులు",
    allDepartments: "అన్ని విభాగాలు",
    filterByDept: "విభాగం ద్వారా ఫిల్టర్ చేయండి:"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Added specific requested strings to translation files.');
