const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Leave Balances translations
enData.leave = {
    ...(enData.leave || {}),
    searchEmployee: "Search Employee",
    searchByNameOrEmail: "Search by name or email...",
    searching: "Searching...",
    noEmployeesFound: "No employees found",
    balancesFor: "Balances for",
    refresh: "Refresh",
    noBalancesFound: "No balances found",
    noBalancesMsg: "This employee has no leave balances. Run allocation first.",
    entitled: "Entitled",
    days: "days",
    adjust: "Adjust",
    selectEmployee: "Select an employee",
    selectEmployeeMsg: "Search for an employee above to view and manage their leave balances.",
    adjustBalance: "Adjust Balance",
    action: "Action",
    grant: "Grant",
    deduct: "Deduct",
    amountDays: "Amount (Days)",
    reasonAsterisk: "Reason *",
    reasonPlaceholder: "e.g. Manual correction, Bonus leave",
    grantLeave: "Grant Leave",
    deductLeave: "Deduct Leave"
};

teData.leave = {
    ...(teData.leave || {}),
    searchEmployee: "ఉద్యోగిని శోధించండి",
    searchByNameOrEmail: "పేరు లేదా ఇమెయిల్ ద్వారా శోధించండి...",
    searching: "వెతుకుతోంది...",
    noEmployeesFound: "ఉద్యోగులు కనుగొనబడలేదు",
    balancesFor: "నిల్వలు వీరికి:",
    refresh: "రిఫ్రెష్ చేయండి",
    noBalancesFound: "నిల్వలు కనుగొనబడలేదు",
    noBalancesMsg: "ఈ ఉద్యోగికి సెలవు నిల్వలు లేవు. ముందుగా కేటాయింపు చేయండి.",
    entitled: "అర్హత",
    days: "రోజులు",
    adjust: "సవరించు",
    selectEmployee: "ఉద్యోగిని ఎంచుకోండి",
    selectEmployeeMsg: "వారి సెలవు నిల్వలను వీక్షించడానికి మరియు నిర్వహించడానికి పైన ఉన్న ఉద్యోగి కోసం శోధించండి.",
    adjustBalance: "బ్యాలెన్స్‌ని సర్దుబాటు చేయండి",
    action: "చర్య",
    grant: "మంజూరు చేయి",
    deduct: "తీసివేయి",
    amountDays: "మొత్తం (రోజులు)",
    reasonAsterisk: "కారణం *",
    reasonPlaceholder: "ఉదా. మాన్యువల్ దిద్దుబాటు, బోనస్ సెలవు",
    grantLeave: "సెలవును మంజూరు చేయి",
    deductLeave: "సెలవును తీసివేయి"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added leave balances translations.');
