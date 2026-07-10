const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Leave Allocation translations
enData.leave = {
    ...(enData.leave || {}),
    allocateLeave: "Allocate Leave",
    year: "Year",
    leaveType: "Leave Type",
    selectType: "Select type",
    daysAmount: "Days",
    allocateTo: "Allocate To",
    allEmployeesTitle: "All Employees",
    allActiveEmployees: "All active employees",
    selectedOnly: "Selected Only",
    chooseEmployees: "Choose employees",
    selected: "selected",
    selectAll: "Select All",
    clear: "Clear",
    name: "Name",
    email: "Email",
    reasonOptional: "Reason (optional)",
    target: "Target",
    clearForm: "Clear Form",
    resetBalances: "Reset Balances",
    allocate: "Allocate",
    success: "Success",
    failed: "Failed",
    processedMsg: "{{processed}} processed",
    failedMsg: ", {{failed}} failed",
    selectLeaveTypeError: "Select leave type and enter valid days",
    selectEmployeeError: "Select at least one employee",
    allocatedToMsg: "Allocated to {{count}} employees",
    resetSuccessMsg: "Reset {{count}} balances successfully",
    confirmAllocation: "Confirm Allocation",
    confirmAllocationAllMsg: "Allocate {{days}} days of {{typeName}} to ALL employees for {{year}}?",
    confirmAllocationSelectedMsg: "Allocate {{days}} days to {{count}} employees for {{year}}?",
    allocateNow: "Allocate Now",
    confirmResetBalances: "Reset Leave Balances",
    confirmResetAllMsg: "RESET {{typeName}} leave balances for ALL employees for {{year}}? This will set balances to 0!",
    confirmResetSelectedMsg: "RESET {{typeName}} leave balances for {{count}} selected employees for {{year}}? This will set balances to 0!",
    resetNow: "Reset Now"
};

teData.leave = {
    ...(teData.leave || {}),
    allocateLeave: "సెలవును కేటాయించండి",
    year: "సంవత్సరం",
    leaveType: "సెలవు రకం",
    selectType: "రకాన్ని ఎంచుకోండి",
    daysAmount: "రోజులు",
    allocateTo: "వీరికి కేటాయించండి",
    allEmployeesTitle: "ఉద్యోగులందరూ",
    allActiveEmployees: "అన్ని క్రియాశీల ఉద్యోగులు",
    selectedOnly: "ఎంచుకున్నవి మాత్రమే",
    chooseEmployees: "ఉద్యోగులను ఎంచుకోండి",
    selected: "ఎంచుకోబడింది",
    selectAll: "అన్నిటినీ ఎంచుకోండి",
    clear: "క్లియర్ చేయండి",
    name: "పేరు",
    email: "ఇమెయిల్",
    reasonOptional: "కారణం (ఐచ్ఛికం)",
    target: "లక్ష్యం",
    clearForm: "ఫారమ్ క్లియర్ చేయండి",
    resetBalances: "బ్యాలెన్స్‌లను రీసెట్ చేయండి",
    allocate: "కేటాయించు",
    success: "విజయం",
    failed: "విఫలమైంది",
    processedMsg: "{{processed}} ప్రాసెస్ చేయబడింది",
    failedMsg: ", {{failed}} విఫలమైంది",
    selectLeaveTypeError: "సెలవు రకాన్ని ఎంచుకుని, చెల్లుబాటు అయ్యే రోజులను నమోదు చేయండి",
    selectEmployeeError: "కనీసం ఒక ఉద్యోగిని ఎంచుకోండి",
    allocatedToMsg: "{{count}} ఉద్యోగులకు కేటాయించబడింది",
    resetSuccessMsg: "{{count}} బ్యాలెన్స్‌లు విజయవంతంగా రీసెట్ చేయబడ్డాయి",
    confirmAllocation: "కేటాయింపును నిర్ధారించండి",
    confirmAllocationAllMsg: "{{year}} కోసం ఉద్యోగులందరికీ పైన పేర్కొన్న {{days}} రోజుల {{typeName}} సెలవును కేటాయించాలా?",
    confirmAllocationSelectedMsg: "{{year}} కోసం {{count}} ఉద్యోగులకు {{days}} రోజులు కేటాయించాలా?",
    allocateNow: "ఇప్పుడే కేటాయించండి",
    confirmResetBalances: "సెలవు నిల్వలను రీసెట్ చేయండి",
    confirmResetAllMsg: "{{year}} సంవత్సరానికి ఉద్యోగులందరికీ {{typeName}} సెలవు నిల్వలను రీసెట్ చేయాలా? ఇది నిల్వలను 0 కి సెట్ చేస్తుంది!",
    confirmResetSelectedMsg: "{{year}} సంవత్సరానికి ఎంచుకున్న {{count}} ఉద్యోగులకు {{typeName}} సెలవు నిల్వలను రీసెట్ చేయాలా? ఇది నిల్వలను 0 కి సెట్ చేస్తుంది!",
    resetNow: "ఇప్పుడే రీసెట్ చేయండి"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added leave allocation translations.');
