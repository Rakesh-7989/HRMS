#!/usr/bin/env node
/**
 * Synthetic Seed Data Generator
 * Generates realistic test data for HRMS
 * Usage: node scripts/synthetic-seed.js [tenantId] [options]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const INDIAN_STATES = [
  'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Delhi',
  'Telangana', 'West Bengal', 'Uttar Pradesh', 'Rajasthan', 'Kerala',
  'Madhya Pradesh', 'Andhra Pradesh', 'Haryana', 'Punjab', 'Bihar',
  'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand',
];

const INDIAN_CITIES = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
};

const FIRST_NAMES_MALE = [
  'Rajesh', 'Amit', 'Sanjay', 'Vikram', 'Anil', 'Sunil', 'Ravi', 'Manoj', 'Deepak', 'Rahul',
  'Sandeep', 'Ajay', 'Vinod', 'Prakash', 'Nitin', 'Ashish', 'Sachin', 'Gaurav', 'Pankaj', 'Kiran',
];

const FIRST_NAMES_FEMALE = [
  'Priya', 'Anjali', 'Sunita', 'Pooja', 'Neha', 'Swati', 'Ritu', 'Shweta', 'Kavita', 'Meena',
  'Rekha', 'Geeta', 'Anita', 'Kavita', 'Suman', 'Lakshmi', 'Radha', 'Meera', 'Nisha', 'Divya',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Agarwal', 'Jain', 'Yadav', 'Patel', 'Shah',
  'Reddy', 'Rao', 'Nair', 'Menon', 'Iyer', 'Chop', 'Das', 'Bose', 'Ghosh', 'Chatterjee',
];

const DEPARTMENTS = [
  'Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations',
  'Product', 'Design', 'QA', 'DevOps', 'Security', 'Legal', 'Admin',
];

const DESIGNATIONS = {
  'Engineering': ['Software Engineer', 'Senior Software Engineer', 'Lead Engineer', 'Engineering Manager', 'Principal Engineer', 'CTO'],
  'HR': ['HR Associate', 'HR Manager', 'Senior HR Manager', 'HR Business Partner', 'Head of HR'],
  'Finance': ['Accountant', 'Senior Accountant', 'Finance Manager', 'Financial Analyst', 'CFO'],
  'Sales': ['Sales Executive', 'Senior Sales Executive', 'Sales Manager', 'Regional Sales Manager', 'VP Sales'],
  'Marketing': ['Marketing Executive', 'Marketing Manager', 'Digital Marketing Specialist', 'Brand Manager', 'CMO'],
  'Operations': ['Operations Associate', 'Operations Manager', 'Senior Operations Manager', 'COO'],
  'Product': ['Product Manager', 'Senior Product Manager', 'Group Product Manager', 'VP Product'],
  'Design': ['UI/UX Designer', 'Senior Designer', 'Design Lead', 'Design Manager'],
  'QA': ['QA Engineer', 'Senior QA Engineer', 'QA Lead', 'QA Manager'],
  'DevOps': ['DevOps Engineer', 'Senior DevOps Engineer', 'DevOps Lead', 'DevOps Manager'],
  'Security': ['Security Analyst', 'Security Engineer', 'Security Lead', 'CISO'],
  'Legal': ['Legal Counsel', 'Senior Legal Counsel', 'General Counsel'],
  'Admin': ['Office Admin', 'Executive Assistant', 'Office Manager'],
};

const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'GraphQL', 'REST API', 'gRPC',
  'CI/CD', 'Terraform', 'Ansible', 'Prometheus', 'Grafana', 'Elasticsearch',
];

const EMAIL_DOMAINS = ['company.com', 'example.com', 'test.com', 'demo.com', 'hrms.io'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomPhone = () => `+91-${randomInt(7000000000, 9999999999)}`;
const randomSalary = (min, max) => randomInt(min, max) * 1000;
const formatDate = (d) => d.toISOString().split('T')[0];
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const generateEmployees = (count, tenantId) => {
  const employees = [];
  const usedEmails = new Set();
  
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? randomItem(FIRST_NAMES_MALE) : randomItem(FIRST_NAMES_FEMALE);
    const lastName = randomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@${randomItem(EMAIL_DOMAINS)}`;
    
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    
    const dept = randomItem(DEPARTMENTS);
    const designation = randomItem(DESIGNATIONS[dept] || ['Employee']);
    const state = randomItem(INDIAN_STATES);
    const city = randomItem(INDIAN_CITIES[state] || ['Bangalore']);
    
    const joiningDate = randomDate(new Date(2015, 0, 1), new Date(2023, 11, 31));
    const exitDate = Math.random() < 0.05 ? addDays(joiningDate, randomInt(180, 2000)) : null;
    
    const employee = {
      tenantId,
      employeeCode: `EMP-${String(i + 1).padStart(4, '0')}`,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: randomPhone(),
      department: dept,
      designation,
      gender: isMale ? 'MALE' : 'FEMALE',
      dateOfBirth: formatDate(randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31))),
      joiningDate: formatDate(joiningDate),
      exitDate: exitDate ? formatDate(exitDate) : null,
      isActive: !exitDate,
      bloodGroup: randomItem(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-']),
      emergencyContactName: `${randomItem(FIRST_NAMES_MALE)} ${randomItem(LAST_NAMES)}`,
      emergencyContactPhone: randomPhone(),
      address: `${randomInt(1, 999)} ${randomItem(['Main', 'Park', 'Lake', 'Hill', 'Valley'])} Road`,
      city,
      state,
      pincode: String(randomInt(100000, 999999)),
      panNumber: `${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomInt(1000, 9999)}${randomItem('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}`,
      aadhaarNumber: `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
      bankAccountNumber: String(randomInt(1000000000, 9999999999)),
      ifscCode: `${randomItem(['HDFC', 'ICIC', 'SBIN', 'UBIN', 'PUNB', 'CNRB', 'IDIB', 'BARB'])}00${randomInt(1000, 9999)}`,
      pfNumber: `MH/BAN/${randomInt(10000, 99999)}/${String(i + 1).padStart(5, '0')}`,
      esicNumber: `${randomInt(1000000000, 9999999999)}`,
      uanNumber: `${randomInt(100000000000, 999999999999)}`,
      skills: JSON.stringify(Array.from({ length: randomInt(3, 8) }, () => randomItem(SKILLS))),
      workExperience: randomInt(0, 20),
      currentCtc: randomSalary(300, 3000),
      previousCtc: randomSalary(200, 2500),
      noticePeriod: randomItem([15, 30, 45, 60, 90]),
      preferredLocation: city,
      willingToRelocate: Math.random() > 0.7,
      maritalStatus: randomItem(['SINGLE', 'MARRIED', 'DIVORCED']),
      nationality: 'Indian',
      bloodGroup: randomItem(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-']),
    };
    
    employees.push(employee);
  }
  
  return employees;
};

const generateDepartments = (tenantId) => {
  return DEPARTMENTS.map((name, i) => ({
    tenantId,
    name,
    code: name.substring(0, 3).toUpperCase(),
    description: `${name} department handling ${name.toLowerCase()} operations`,
    headEmployeeId: null,
    parentDepartmentId: null,
    isActive: true,
    sortOrder: i + 1,
  }));
};

const generateDesignations = (tenantId) => {
  const designations = [];
  for (const [dept, desigs] of Object.entries(DESIGNATIONS)) {
    for (let i = 0; i < desigs.length; i++) {
      designations.push({
        tenantId,
        name: desigs[i],
        department: dept,
        level: i + 1,
        grade: String.fromCharCode(65 + i),
        minSalary: 300000 + i * 100000,
        maxSalary: 800000 + i * 200000,
        description: `${desigs[i]} in ${dept} department`,
        isActive: true,
        sortOrder: i + 1,
      });
    }
  }
  return designations;
};

const generateLeaveTypes = (tenantId) => {
  return [
    { tenantId, name: 'Annual Leave', code: 'AL', description: 'Annual vacation leave', daysPerYear: 21, carryForward: true, maxCarryForward: 10, requiresApproval: true, isPaid: true, color: '#4CAF50' },
    { tenantId, name: 'Sick Leave', code: 'SL', description: 'Medical leave', daysPerYear: 12, carryForward: false, maxCarryForward: 0, requiresApproval: false, isPaid: true, color: '#F44336' },
    { tenantId, name: 'Casual Leave', code: 'CL', description: 'Short personal leave', daysPerYear: 6, carryForward: false, maxCarryForward: 0, requiresApproval: true, isPaid: true, color: '#FF9800' },
    { tenantId, name: 'Maternity Leave', code: 'ML', description: 'Maternity leave for female employees', daysPerYear: 180, carryForward: false, maxCarryForward: 0, requiresApproval: true, isPaid: true, color: '#E91E63' },
    { tenantId, name: 'Paternity Leave', code: 'PL', description: 'Paternity leave for male employees', daysPerYear: 15, carryForward: false, maxCarryForward: 0, requiresApproval: true, isPaid: true, color: '#2196F3' },
    { tenantId, name: 'Compensatory Off', code: 'CO', description: 'Compensatory off for working on holidays', daysPerYear: 0, carryForward: false, maxCarryForward: 0, requiresApproval: true, isPaid: true, color: '#9C27B0' },
    { tenantId, name: 'Loss of Pay', code: 'LOP', description: 'Unpaid leave', daysPerYear: 0, carryForward: false, maxCarryForward: 0, requiresApproval: true, isPaid: false, color: '#795548' },
  ];
};

const generateHolidays = (tenantId, year) => {
  const holidays = [
    { name: 'New Year\'s Day', date: `${year}-01-01`, type: 'NATIONAL' },
    { name: 'Republic Day', date: `${year}-01-26`, type: 'NATIONAL' },
    { name: 'Holi', date: `${year}-03-08`, type: 'FESTIVAL' },
    { name: 'Good Friday', date: `${year}-03-29`, type: 'FESTIVAL' },
    { name: 'Eid ul-Fitr', date: `${year}-04-10`, type: 'FESTIVAL' },
    { name: 'Labour Day', date: `${year}-05-01`, type: 'NATIONAL' },
    { name: 'Independence Day', date: `${year}-08-15`, type: 'NATIONAL' },
    { name: 'Ganesh Chaturthi', date: `${year}-09-07`, type: 'FESTIVAL' },
    { name: 'Gandhi Jayanti', date: `${year}-10-02`, type: 'NATIONAL' },
    { name: 'Dussehra', date: `${year}-10-12`, type: 'FESTIVAL' },
    { name: 'Diwali', date: `${year}-11-01`, type: 'FESTIVAL' },
    { name: 'Christmas', date: `${year}-12-25`, type: 'FESTIVAL' },
  ];
  
  return holidays.map(h => ({
    tenantId,
    name: h.name,
    date: h.date,
    type: h.type,
    description: `${h.name} holiday`,
    isOptional: h.type === 'FESTIVAL',
    isRecurring: true,
    applicableTo: 'ALL',
    color: '#FF5722',
  }));
};

const generateAttendance = async (tenantId, employees, startDate, endDate) => {
  const attendance = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (const emp of employees) {
    if (!emp.isActive) continue;
    const joinDate = new Date(emp.joiningDate);
    if (joinDate > end) continue;
    
    const empStart = joinDate > start ? joinDate : start;
    const empEnd = emp.exitDate ? new Date(emp.exitDate) : end;
    if (empEnd > end) empEnd = end;
    
    const currentDate = new Date(empStart);
    while (currentDate <= empEnd) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = Math.random() < 0.03;
      
      let status;
      if (isWeekend) {
        status = 'WEEKEND';
      } else if (isHoliday) {
        status = 'HOLIDAY';
      } else {
        const rand = Math.random();
        if (rand < 0.85) status = 'PRESENT';
        else if (rand < 0.92) status = 'LATE';
        else if (rand < 0.96) status = 'HALF_DAY';
        else if (rand < 0.99) status = 'WFH';
        else status = 'ABSENT';
      }
      
      let checkIn = null, checkOut = null, totalHours = 0, overtimeHours = 0;
      if (status === 'PRESENT' || status === 'LATE' || status === 'WFH') {
        const baseHour = status === 'LATE' ? 10 : 9;
        checkIn = `${baseHour}:${String(randomInt(0, 30)).padStart(2, '0')}:00`;
        const outHour = 18 + randomInt(0, 2);
        checkOut = `${outHour}:${String(randomInt(0, 30)).padStart(2, '0')}:00`;
        totalHours = outHour - baseHour + randomInt(0, 30) / 60;
        if (totalHours > 9) overtimeHours = totalHours - 9;
      } else if (status === 'HALF_DAY') {
        checkIn = '09:00:00';
        checkOut = '13:00:00';
        totalHours = 4;
      }
      
      attendance.push({
        tenantId,
        employeeId: null, // Will be set after employee insert
        date: formatDate(currentDate),
        status,
        checkIn,
        checkOut,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        breakMinutes: 60,
        lateMinutes: status === 'LATE' ? randomInt(15, 120) : 0,
        earlyDepartureMinutes: 0,
        location: 'Office',
        ipAddress: `192.168.1.${randomInt(1, 255)}`,
        deviceId: `DEV-${randomInt(1000, 9999)}`,
        isManualEntry: false,
        notes: null,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return attendance;
};

const generateLeaveRequests = async (tenantId, employees, startDate, endDate) => {
  const leaveTypes = await pool.query(
    `SELECT id, name, days_per_year FROM leave_types WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  ).then(r => r.rows);
  
  const leaveRequests = [];
  
  for (const emp of employees) {
    if (!emp.isActive) continue;
    const leaveCount = randomInt(0, 4);
    
    for (let i = 0; i < leaveCount; i++) {
      const leaveType = randomItem(leaveTypes);
      const start = randomDate(new Date(startDate), new Date(endDate));
      const maxDays = Math.min(leaveType.days_per_year, 10);
      const days = randomInt(1, maxDays);
      const end = addDays(start, days - 1);
      
      if (end > new Date(endDate)) continue;
      
      const status = randomItem(['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED']);
      
      leaveRequests.push({
        tenantId,
        employeeId: null,
        leaveTypeId: leaveType.id,
        startDate: formatDate(start),
        endDate: formatDate(end),
        totalDays: days,
        reason: randomItem([
          'Family function', 'Medical appointment', 'Personal work', 'Travel',
          'Child care', 'Marriage', 'Festival', 'Health checkup', 'Vacation'
        ]),
        status,
        appliedOn: formatDate(randomDate(new Date(startDate), start)),
        approvedBy: status === 'APPROVED' ? 1 : null,
        approvedOn: status === 'APPROVED' ? formatDate(addDays(start, -randomInt(1, 5))) : null,
        rejectionReason: status === 'REJECTED' ? 'Insufficient leave balance' : null,
        isHalfDay: false,
        attachmentUrl: null,
      });
    }
  }
  
  return leaveRequests;
};

const generatePayrollComponents = (employeeId, payrollRunId, ctc) => {
  const basic = Math.round(ctc * 0.4);
  const hra = Math.round(ctc * 0.3);
  const da = Math.round(ctc * 0.1);
  const allowances = Math.round(ctc * 0.15);
  const gross = basic + hra + da + allowances;
  
  const pf = Math.min(1800, Math.round(basic * 0.12));
  const esi = Math.round(gross * 0.0075);
  const pt = 200;
  const tds = Math.max(0, Math.round((ctc * 12 - 250000) * 0.1 / 12));
  
  const employeePf = Math.round(basic * 0.12);
  const employeeEsi = Math.round(gross * 0.0075);
  const employeePt = pt;
  const employeeTds = tds;
  
  const employerPf = Math.min(1800, Math.round(basic * 0.12));
  const employerEsi = Math.round(gross * 0.0325);
  const employerLwf = 50;
  
  const totalDeductions = employeePf + employeeEsi + employeePt + employeeTds;
  const net = gross - totalDeductions;
  
  return [
    { payrollRunId: null, componentCode: 'BASIC', componentName: 'Basic Pay', componentType: 'EARNING', amount: basic, isTaxable: true, isStatutory: false, displayOrder: 1, isActive: true },
    { payrollRunId: null, componentCode: 'HRA', componentName: 'House Rent Allowance', componentType: 'EARNING', amount: hra, isTaxable: true, isStatutory: false, displayOrder: 2, isActive: true },
    { payrollRunId: null, componentCode: 'DA', componentName: 'Dearness Allowance', componentType: 'EARNING', amount: Math.round(ctc * 0.1), isTaxable: true, isStatutory: false, displayOrder: 3, isActive: true },
    { payrollRunId: null, componentCode: 'ALLOW', componentName: 'Special Allowance', componentType: 'EARNING', amount: Math.round(ctc * 0.15), isTaxable: true, isStatutory: false, displayOrder: 4, isActive: true },
    { payrollRunId: null, componentCode: 'GROSS', componentName: 'Gross Pay', componentType: 'EARNING', amount: Math.round(basic + hra + Math.round(ctc * 0.1) + Math.round(ctc * 0.15)), isTaxable: true, isStatutory: false, displayOrder: 5, isActive: true },
    { payrollRunId: null, componentCode: 'PF_EMP', componentName: 'Employee PF', componentType: 'DEDUCTION', amount: Math.min(1800, Math.round(gross * 0.12)), isTaxable: false, isStatutory: true, displayOrder: 1, isActive: true },
    { payrollRunId: null, componentCode: 'ESI_EMP', componentName: 'Employee ESI', componentType: 'DEDUCTION', amount: Math.round(gross * 0.0075), isTaxable: false, isStatutory: true, displayOrder: 2, isActive: true },
    { payrollRunId: null, componentCode: 'PT', componentName: 'Professional Tax', componentType: 'DEDUCTION', amount: 200, isTaxable: false, isStatutory: true, displayOrder: 3, isActive: true },
    { payrollRunId: null, componentCode: 'TDS', componentName: 'TDS', componentType: 'DEDUCTION', amount: Math.max(0, Math.round((gross * 12 - 250000) * 0.1 / 12)), isTaxable: false, isStatutory: true, displayOrder: 4, isActive: true },
    { payrollRunId: null, componentCode: 'PF_EMPR', componentName: 'Employer PF', componentType: 'EMPLOYER_STATUTORY', amount: Math.min(1800, Math.round(gross * 0.12)), isTaxable: false, isStatutory: true, displayOrder: 1, isActive: true },
    { payrollRunId: null, componentCode: 'ESI_EMPR', componentName: 'Employer ESI', componentType: 'EMPLOYER_STATUTORY', amount: Math.round(gross * 0.0325), isTaxable: false, isStatutory: true, displayOrder: 2, isActive: true },
    { payrollRunId: null, componentCode: 'LWF', componentName: 'Labour Welfare Fund', componentType: 'EMPLOYER_STATUTORY', amount: 50, isTaxable: false, isStatutory: true, displayOrder: 3, isActive: true },
  ];
};

const seedDatabase = async (tenantId, employeeCount) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🌱 Seeding data for tenant: ${tenantId}`);
    console.log(`Generating ${employeeCount} employees...`);
    
    // 1. Departments
    const depts = generateDepartments(tenantId);
    for (const dept of depts) {
      await client.query(`
        INSERT INTO departments (tenant_id, name, code, description, head_employee_id, parent_department_id, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, code) DO NOTHING
      `, [dept.tenantId, dept.name, dept.code, dept.description, dept.headEmployeeId, dept.parentDepartmentId, dept.isActive, dept.sortOrder]);
    }
    
    // Get department IDs
    const deptRows = await client.query(`SELECT id, code FROM departments WHERE tenant_id = $1`, [tenantId]);
    const deptMap = new Map(deptRows.rows.map(d => [d.code, d.id]));
    
    // 2. Designations
    const designations = generateDesignations(tenantId);
    for (const desig of designations) {
      const deptId = deptMap.get(desig.department);
      if (!deptId) continue;
      await client.query(`
        INSERT INTO designations (tenant_id, name, department_id, level, grade, min_salary, max_salary, description, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id, name) DO NOTHING
      `, [desig.tenantId, desig.name, deptId, desig.level, desig.grade, desig.minSalary, desig.maxSalary, desig.description, desig.isActive, desig.sortOrder]);
    }
    
    // Get designation IDs
    const desigRows = await client.query(`SELECT id, name FROM designations WHERE tenant_id = $1`, [tenantId]);
    const desigMap = new Map(desigRows.rows.map(d => [d.name, d.id]));
    
    // 3. Leave Types
    const leaveTypes = generateLeaveTypes(tenantId);
    for (const lt of leaveTypes) {
      await client.query(`
        INSERT INTO leave_types (tenant_id, name, code, description, days_per_year, carry_forward, max_carry_forward, requires_approval, is_paid, color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id, code) DO NOTHING
      `, [lt.tenantId, lt.name, lt.code, lt.description, lt.daysPerYear, lt.carryForward, lt.maxCarryForward, lt.requiresApproval, lt.isPaid, lt.color]);
    }
    
    // Get leave type IDs
    const ltRows = await client.query(`SELECT id, code FROM leave_types WHERE tenant_id = $1`, [tenantId]);
    const ltMap = new Map(ltRows.rows.map(l => [l.code, l.id]));
    
    // 4. Holidays
    const currentYear = new Date().getFullYear();
    const holidays = generateHolidays(tenantId, currentYear);
    for (const h of holidays) {
      await client.query(`
        INSERT INTO holidays (tenant_id, name, date, type, description, is_optional, is_recurring, applicable_to, color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, date) DO NOTHING
      `, [h.tenantId, h.name, h.date, h.type, h.description, h.isOptional, h.isRecurring, h.applicableTo, h.color]);
    }
    
    // 5. Employees
    console.log(`Creating ${deptRows.rows.length} employees...`);
    const employees = generateEmployees(100, tenantId);
    const employeeMap = new Map();
    
    for (const emp of employees) {
      const deptId = deptMap.get(emp.department);
      const desigId = desigMap.get(emp.designation);
      
      const result = await client.query(`
        INSERT INTO employees (
          tenant_id, employee_code, first_name, last_name, email, phone, department_id, designation_id,
          gender, date_of_birth, joining_date, exit_date, is_active, blood_group,
          emergency_contact_name, emergency_contact_phone, address, city, state, pincode,
          pan_number, aadhaar_number, bank_account_number, ifsc_code, pf_number, esic_number, uan_number,
          skills, work_experience, current_ctc, previous_ctc, notice_period, preferred_location,
          willing_to_relocate, marital_status, nationality, blood_group
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $31, $32, $33, $34, $35, $36
        )
        ON CONFLICT (tenant_id, employee_code) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `, [
        emp.tenantId, emp.employeeCode, emp.firstName, emp.lastName, emp.email,
        emp.phone, deptId, desigId, emp.gender, emp.dateOfBirth, emp.joiningDate,
        emp.exitDate, emp.isActive, emp.bloodGroup, emp.emergencyContactName,
        emp.emergencyContactPhone, emp.address, emp.city, emp.state, emp.pincode,
        emp.panNumber, emp.aadhaarNumber, emp.bankAccountNumber, emp.ifscCode,
        emp.pfNumber, emp.esicNumber, emp.uanNumber, emp.skills, emp.workExperience,
        emp.currentCtc, emp.previousCtc, emp.noticePeriod, emp.preferredLocation,
        emp.willingToRelocate, emp.maritalStatus, emp.nationality, emp.bloodGroup
      ]);
      
      employeeMap.set(emp.employeeCode, result.rows[0].id);
    }
    
    // Update departments with heads
    for (const [code, deptId] of deptMap) {
      const headEmp = Array.from(employeeMap.entries()).find(([code]) => code.startsWith('EMP-'));
      if (headEmp) {
        await client.query(`UPDATE departments SET head_employee_id = $1 WHERE id = $2`, [headEmp[1], deptId]);
      }
    }
    
    // 5. Attendance (last 3 months)
    console.log('Generating attendance records...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 3);
    
    const attendance = await generateAttendance(tenantId, employees, formatDate(startDate), formatDate(endDate));
    console.log(`Generated ${attendance.length} attendance records`);
    
    for (const att of attendance) {
      const empId = employeeMap.get(att.employeeCode);
      if (!empId) continue;
      
      await client.query(`
        INSERT INTO attendance (
          tenant_id, employee_id, date, status, check_in, check_out,
          total_hours, overtime_hours, break_minutes, late_minutes,
          early_departure_minutes, location, ip_address, device_id,
          is_manual_entry, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (tenant_id, employee_id, date) DO NOTHING
      `, [
        tenantId, empId, att.date, att.status, att.checkIn, att.checkOut,
        att.totalHours, att.overtimeHours, att.breakMinutes, att.lateMinutes,
        att.earlyDepartureMinutes, att.location, att.ipAddress, att.deviceId,
        att.isManualEntry, att.notes
      ]);
    }
    
    // 6. Leave Requests
    console.log('Generating leave requests...');
    const leaveRequests = await generateLeaveRequests(tenantId, employees, '2024-01-01', '2024-12-31');
    
    for (const lr of leaveRequests) {
      const empId = employeeMap.get(lr.employeeCode);
      if (!empId) continue;
      
      await client.query(`
        INSERT INTO leave_requests (
          tenant_id, employee_id, leave_type_id, start_date, end_date,
          total_days, reason, status, applied_on, approved_by, approved_on,
          rejection_reason, is_half_day, attachment_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING
      `, [
        tenantId, employeeMap.get(lr.employeeCode), lr.leaveTypeId,
        lr.startDate, lr.endDate, lr.totalDays, lr.reason, lr.status,
        lr.appliedOn, lr.approvedBy, lr.approvedOn, lr.rejectionReason,
        lr.isHalfDay, lr.attachmentUrl
      ]);
    }
    
    // 7. Payroll Runs (last 3 months)
    console.log('Generating payroll runs...');
    const payrollMonths = ['2024-01', '2024-02', '2024-03'];
    
    for (const month of payrollMonths) {
      const [year, monthNum] = month.split('-').map(Number);
      const payDate = new Date(year, monthNum - 1, 1);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0);
      
      for (const emp of employees) {
        if (!emp.isActive) continue;
        const empId = employeeMap.get(emp.employeeCode);
        if (!empId) continue;
        
        const ctc = emp.currentCtc * 1000;
        const basic = Math.round(ctc * 0.4);
        const hra = Math.round(ctc * 0.3);
        const da = Math.round(ctc * 0.1);
        const allowances = Math.round(ctc * 0.15);
        const gross = basic + Math.round(ctc * 0.3) + Math.round(ctc * 0.1) + Math.round(ctc * 0.15);
        
        const pf = Math.min(1800, Math.round(basic * 0.12));
        const esi = Math.round(gross * 0.0075);
        const pt = 200;
        const tds = Math.max(0, Math.round((ctc * 12 - 250000) * 0.1 / 12));
        
        const net = gross - Math.min(1800, Math.round(gross * 0.12)) - Math.round(gross * 0.0075) - 200 - tds;
        
        const pfEmp = Math.min(1800, Math.round(basic * 0.12));
        const esiEmp = Math.round(gross * 0.0075);
        const ptEmp = 200;
        const tdsEmp = tds;
        
        const pfEmpR = Math.min(1800, Math.round(basic * 0.12));
        const esiEmpR = Math.round(gross * 0.0325);
        const lwfEmpR = 50;
        
        const components = generatePayrollComponents(null, null, ctc / 1000);
        
        await client.query(`
          INSERT INTO payroll_runs (
            tenant_id, employee_id, pay_period_start, pay_period_end,
            pay_date, basic_pay, hra, da, allowances, gross_pay,
            employee_pf, employee_esi, employee_pt, tds,
            net_pay, employer_pf, employer_esi, employer_lwf,
            gross_earnings, total_deductions, total_employer_statutory,
            status, processed_by, processed_on
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (tenant_id, employee_id, pay_period_start, pay_period_end) DO NOTHING
        `, [
          tenantId, employeeMap.get(emp.employeeCode),
          formatDate(new Date(2024, 0, 1)), formatDate(new Date(2024, 1, 29)),
          formatDate(new Date(2024, 1, 1)), basic, Math.round(ctc * 0.3),
          Math.round(ctc * 0.1), Math.round(ctc * 0.15), gross,
          Math.min(1800, Math.round(gross * 0.12)), Math.round(gross * 0.0075), 200, tds,
          net, Math.min(1800, Math.round(basic * 0.12)), Math.round(gross * 0.0325), 50,
          gross, Math.min(1800, Math.round(gross * 0.12)) + Math.round(gross * 0.0075) + 200 + tds,
          Math.min(1800, Math.round(basic * 0.12)) + Math.round(gross * 0.0325) + 50,
          'PROCESSED', 1, formatDate(new Date())
        ]);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Seed completed successfully!');
    console.log(`Created ${employeeMap.size} employees with all related data`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const tenantId = args[0] || '00000000-0000-0000-0000-000000000001';
  const employeeCount = parseInt(args[1]) || 50;
  
  console.log('🌱 Synthetic Seed Data Generator');
  console.log('='.repeat(50));
  
  try {
    await seedDatabase(tenantId, employeeCount);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();