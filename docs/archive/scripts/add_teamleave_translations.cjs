const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Leave translations
enData.leave = {
    ...(enData.leave || {}),
    total30d: "Total (30d)",
    approved30d: "Approved (30d)",
    rejected30d: "Rejected (30d)",
    pendingApprovals: "Pending Approvals",
    requestHistory: "Request History",
    actionRequired: "Action Required",
    processedRequests: "Processed Requests",
    searchByNameOrReason: "Search by name or reason...",
    noMatchingRequests: "No requests match your current filters",
    greatNoPending: "Great! No pending leave requests",
    noProcessedFound: "No processed requests found",
    approver: "Approver",
    reportingManager: "Reporting Manager",
    noManager: "No Manager",
    rejectLeaveApplication: "Reject Leave Application",
    aboutToReject: "You are about to reject the leave request for",
    rejectionReasonLabel: "Rejection Reason *",
    provideReasonPlaceholder: "Please provide a reason for rejection (minimum 5 characters)...",
    reasonMustBe5Chars: "Reason must be at least 5 characters",
    confirmRejection: "Confirm Rejection"
};

teData.leave = {
    ...(teData.leave || {}),
    total30d: "మొత్తం (30 రోజులు)",
    approved30d: "ఆమోదించబడినవి (30 రోజులు)",
    rejected30d: "తిరస్కరించబడినవి (30 రోజులు)",
    pendingApprovals: "పెండింగ్ ఆమోదాలు",
    requestHistory: "అభ్యర్థన చరిత్ర",
    actionRequired: "చర్య అవసరం",
    processedRequests: "ప్రాసెస్ చేయబడిన అభ్యర్థనలు",
    searchByNameOrReason: "పేరు లేదా కారణం ద్వారా శోధించండి...",
    noMatchingRequests: "మీ ఫిల్టర్‌లకు సరిపోయే అభ్యర్థనలు ఏవీ లేవు",
    greatNoPending: "గొప్పది! పెండింగ్‌లో ఉన్న సెలవు అభ్యర్థనలు ఏవీ లేవు",
    noProcessedFound: "ప్రాసెస్ చేయబడిన అభ్యర్థనలు ఏవీ కనుగొనబడలేదు",
    approver: "ఆమోదించే వ్యక్తి",
    reportingManager: "రిపోర్టింగ్ మేనేజర్",
    noManager: "మేనేజర్ లేరు",
    rejectLeaveApplication: "సెలవు దరఖాస్తును తిరస్కరించండి",
    aboutToReject: "మీరు ఈ సెలవు అభ్యర్థనను తిరస్కరించబోతున్నారు",
    rejectionReasonLabel: "తిరస్కరణ కారణం *",
    provideReasonPlaceholder: "దయచేసి తిరస్కరణకు కారణాన్ని అందించండి (కనీసం 5 అక్షరాలు)...",
    reasonMustBe5Chars: "కారణం కనీసం 5 అక్షరాలు ఉండాలి",
    confirmRejection: "తిరస్కరణను నిర్ధారించండి"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added more team leave translations.');
