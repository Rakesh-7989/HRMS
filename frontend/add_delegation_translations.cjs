const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

enData.delegation = {
    whatAreDelegations: "What are Delegations?",
    delegationsDesc: "When you're away (on vacation, sick leave, etc.), you can delegate your leave approval authority to another manager. That person will then be able to approve or reject leave requests from your direct reports during the delegation period.",
    createDelegation: "Create Delegation",
    myDelegations: "My Delegations",
    myDelegationsDesc: "(Approval authority I've given to others)",
    noActiveDelegations: "No active delegations. Create one when you're going to be away.",
    delegate: "Delegate",
    period: "Period",
    reason: "Reason",
    status: "Status",
    actions: "Actions",
    unknown: "Unknown",
    active: "Active",
    expired: "Expired",
    delegatedToMe: "Delegated To Me",
    delegatedToMeDesc: "(Approval authority given to me by other managers)",
    noOneDelegated: "No one has delegated their approval authority to you.",
    delegatedBy: "Delegated By",
    dialogInfo: "The selected person will be able to approve/reject leave requests from your direct reports during this period.",
    delegateToAsterisk: "Delegate To *",
    change: "Change",
    searchDelegatePlaceholder: "Search for a manager or HR...",
    startDateAsterisk: "Start Date *",
    endDateAsterisk: "End Date *",
    reasonOptional: "Reason (Optional)",
    reasonPlaceholder: "e.g., On vacation, attending conference...",
    cancel: "Cancel",
    revokeDelegation: "Revoke delegation"
};

teData.delegation = {
    whatAreDelegations: "ప్రతినిధిత్వాలు (Delegations) అంటే ఏమిటి?",
    delegationsDesc: "మీరు దూరంగా ఉన్నప్పుడు (సెలవు, అనారోగ్య సెలవు మొదలైనవి), మీరు మీ సెలవు ఆమోద అధికారాన్ని మరొక మేనేజర్‌కు బదిలీ చేయవచ్చు. ఆ వ్యక్తి ఆ కాలంలో మీ రిపోర్ట్‌ల నుండి సెలవు అభ్యర్థనలను ఆమోదించగలరు లేదా తిరస్కరించగలరు.",
    createDelegation: "ప్రతినిధిత్వాన్ని సృష్టించండి",
    myDelegations: "నా ప్రతినిధిత్వాలు",
    myDelegationsDesc: "(ఇతరులకు నేను ఇచ్చిన ఆమోద అధికారం)",
    noActiveDelegations: "క్రియాశీల ప్రతినిధిత్వాలు లేవు. మీరు దూరంగా ఉన్నప్పుడు ఒకదాన్ని సృష్టించండి.",
    delegate: "ప్రతినిధి",
    period: "వ్యవధి",
    reason: "కారణం",
    status: "స్థితి",
    actions: "చర్యలు",
    unknown: "తెలియదు",
    active: "క్రియాశీల",
    expired: "గడువు ముగిసింది",
    delegatedToMe: "నాకు ఇవ్వబడినవి",
    delegatedToMeDesc: "(ఇతర మేనేజర్ల ద్వారా నాకు ఇవ్వబడిన ఆమోద అధికారం)",
    noOneDelegated: "ఎవరూ తమ ఆమోద అధికారాన్ని మీకు బదిలీ చేయలేదు.",
    delegatedBy: "ఇచ్చిన వారు",
    dialogInfo: "ఎంచుకున్న వ్యక్తి ఈ కాలంలో మీ రిపోర్ట్‌ల నుండి సెలవు అభ్యర్థనలను ఆమోదించగలరు/తిరస్కరించగలరు.",
    delegateToAsterisk: "ప్రతినిధికి ఇవ్వండి *",
    change: "మార్చండి",
    searchDelegatePlaceholder: "మానేజర్ లేదా HR కోసం వెతకండి...",
    startDateAsterisk: "ప్రారంభ తేదీ *",
    endDateAsterisk: "ముగింపు తేదీ *",
    reasonOptional: "కారణం (ఐచ్ఛికం)",
    reasonPlaceholder: "ఉదా., సెలవులో ఉన్నారు, సదస్సుకు హాజరవుతున్నారు...",
    cancel: "రద్దు చేయి",
    revokeDelegation: "ప్రతినిధిత్వాన్ని రద్దు చేయండి"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added delegation translations.');
