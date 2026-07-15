const fs = require('fs');
const path = require('path');

const localesPath = path.resolve(__dirname, 'src', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const teFile = path.join(localesPath, 'te.json');

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const teData = JSON.parse(fs.readFileSync(teFile, 'utf8'));

// Apply Project translations
enData.projects = {
    ...(enData.projects || {}),
    list: "List",
    reports: "Reports",
    timesheets: "Timesheets",
    manageClients: "Manage Clients",
    addProject: "Add Project",
    searchProjects: "Search projects...",
    allClients: "All Clients",
    allStatus: "All Status",
    projectName: "Project Name",
    client: "Client",
    timeline: "Timeline",
    status: "Status",
    actions: "Actions"
};

teData.projects = {
    ...(teData.projects || {}),
    list: "జాబితా",
    reports: "నివేదికలు",
    timesheets: "టైమ్‌షీట్‌లు",
    manageClients: "క్లయింట్‌లను నిర్వహించండి",
    addProject: "ప్రాజెక్ట్‌ను జోడించండి",
    searchProjects: "ప్రాజెక్ట్‌లను శోధించండి...",
    allClients: "అందరు క్లయింట్లు",
    allStatus: "అన్ని స్థితులు",
    projectName: "ప్రాజెక్ట్ పేరు",
    client: "క్లయింట్",
    timeline: "కాలక్రమం",
    status: "స్థితి",
    actions: "చర్యలు"
};

fs.writeFileSync(enFile, JSON.stringify(enData, null, 4));
fs.writeFileSync(teFile, JSON.stringify(teData, null, 4));
console.log('Successfully added project translations.');
