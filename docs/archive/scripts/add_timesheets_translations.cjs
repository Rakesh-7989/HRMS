const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Timesheets translations
enData.timesheets = {
    ...(enData.timesheets || {}),
    timePortal: "Time Portal",
    subTitle: "High-fidelity employee auditing & logging",
    myLog: "My Log",
    auditQueue: "Audit Queue",
    title: "Timesheets",
    logTime: "Log Time",
    history: "Timesheet History",
    pending: "Pending",
    historyTab: "History",
    allEmployees: "All Employees",
    allStatuses: "All Statuses",
    bulkApprovalMode: "Bulk Approval Mode",
    selected: "selected",
    weeklyTimesheet: "weekly timesheet",
    weeklyTimesheets: "weekly timesheets",
    cancel: "Cancel",
    processing: "Processing...",
    approveSelected: "Approve Selected",
    pendingApprovals: "Pending Approvals",
    historicalPortal: "Historical Portal",
    awaitingReview: "Weekly timesheets awaiting review",
    comprehensiveAudit: "Comprehensive audit of all logged time",
    selectAll: "Select All",
    count: "Count",
    loadingData: "Loading Portal Data...",
    allClear: "All Clear",
    noPending: "No pending timesheets to review",
    recorded: "Recorded",
    weekPeriod: "Week Period",
    hrs: "Hrs",
    recordings: "RECORDINGS",
    reject: "Reject",
    approve: "Approve",
    timesheetApproval: "Timesheet Approval",
    timesheetReview: "Timesheet Review"
};

teData.timesheets = {
    ...(teData.timesheets || {}),
    timePortal: "టైమ్ పోర్టల్",
    subTitle: "హై-ఫిడిలిటీ ఎంప్లాయీ ఆడిటింగ్ & లాగింగ్",
    myLog: "నా లాగ్",
    auditQueue: "ఆడిట్ క్యూ",
    title: "టైమ్‌షీట్‌లు",
    logTime: "సమయాన్ని లాగ్ చేయండి",
    history: "టైమ్‌షీట్ చరిత్ర",
    pending: "పెండింగ్‌లో ఉంది",
    historyTab: "చరిత్ర",
    allEmployees: "ఉద్యోగులందరూ",
    allStatuses: "అన్ని స్థితులు",
    bulkApprovalMode: "బల్క్ ఆమోదం మోడ్",
    selected: "ఎంపిక చేయబడింది",
    weeklyTimesheet: "వారం టైమ్‌షీట్",
    weeklyTimesheets: "వారం టైమ్‌షీట్‌లు",
    cancel: "రద్దు చేయి",
    processing: "ప్రాసెస్ చేయబడుతోంది...",
    approveSelected: "ఎంచుకున్నవి ఆమోదించండి",
    pendingApprovals: "పెండింగ్ ఆమోదాలు",
    historicalPortal: "చారిత్రక పోర్టల్",
    awaitingReview: "సమీక్ష కోసం వేచి ఉన్న వారం టైమ్‌షీట్‌లు",
    comprehensiveAudit: "లాగ్ చేయబడిన మొత్తం సమయం యొక్క సమగ్ర ఆడిట్",
    selectAll: "అన్నింటినీ ఎంచుకోండి",
    count: "లెక్కింపు",
    loadingData: "పోర్టల్ డేటా లోడ్ అవుతోంది...",
    allClear: "అన్నీ స్పష్టంగా ఉన్నాయి",
    noPending: "సమీక్షించడానికి పెండింగ్ టైమ్‌షీట్‌లు లేవు",
    recorded: "నమోదు చేయబడింది",
    weekPeriod: "వారం వ్యవధి",
    hrs: "గంటలు",
    recordings: "రికార్డింగ్‌లు",
    reject: "తిరస్కరించు",
    approve: "ఆమోదించు",
    timesheetApproval: "టైమ్‌షీట్ ఆమోదం",
    timesheetReview: "టైమ్‌షీట్ సమీక్ష"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added timesheets translations.');
