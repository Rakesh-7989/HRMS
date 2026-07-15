#!/usr/bin/env node
/**
 * Month-End Diff Generator
 * Compares payroll/attendance data between two months
 * Usage: node scripts/month-end-diff.js [tenantId] [prevMonth] [currMonth]
 * Example: node scripts/month-end-diff.js tenant-123 2024-01 2024-02
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const formatDate = (date) => date.toISOString().split('T')[0];

const parseMonth = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: new Date(year, month, 0).toISOString().split('T')[0],
    year,
    month,
    label: `${year}-${String(month).padStart(2, '0')}`,
  };
};

const getCurrentAndPrevMonth = () => {
  const now = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();
  const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
  const prevYear = currMonth === 1 ? currYear - 1 : currYear;
  return {
    curr: { year: currYear, month: currMonth },
    prev: { year: prevYear, month: prevMonth },
  };
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const diffValues = (prev, curr) => {
  const p = Number(prev || 0);
  const c = Number(curr || 0);
  const diff = c - p;
  const pct = p === 0 ? (c > 0 ? 100 : 0) : ((diff / Math.abs(p)) * 100);
  return { prev: p, curr: c, diff, pct: Math.round(pct * 100) / 100 };
};

const formatDiff = (d) => {
  const sign = d.diff > 0 ? '+' : '';
  return `${sign}${formatCurrency(d.diff)} (${sign}${d.pct.toFixed(1)}%)`;
};

const runQuery = async (sql, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getPayrollSummary = async (tenantId, start, end) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT pr.employee_id) as employee_count,
      COUNT(pr.id) as payroll_runs,
      SUM(pr.gross_pay) as total_gross,
      SUM(pr.net_pay) as total_net,
      SUM(pr.employer_pf + pr.employer_esi + pr.employer_lwf) as total_employer_statutory,
      SUM(pr.employee_pf + pr.employee_esi + pr.employee_pt + pr.tds) as total_employee_deductions,
      SUM(pr.basic_pay) as total_basic,
      SUM(pr.hra) as total_hra,
      SUM(pr.allowances) as total_allowances
    FROM payroll_runs pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE e.tenant_id = $1 AND pr.pay_date BETWEEN $2 AND $3
  `;
  const rows = await pool.query(sql, [tenantId, start, end]);
  return rows[0] || {};
};

const getAttendanceSummary = async (tenantId, start, end) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT a.employee_id) as employees_with_attendance,
      COUNT(*) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days,
      SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) as late_days,
      SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END) as half_days,
      SUM(CASE WHEN a.status = 'WFH' THEN 1 ELSE 0 END) as wfh_days,
      SUM(CASE WHEN a.status = 'ON_LEAVE' THEN 1 ELSE 0 END) as leave_days,
      SUM(COALESCE(a.overtime_hours, 0)) as total_overtime_hours
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE e.tenant_id = $1 AND a.date BETWEEN $2 AND $3
  `;
  const rows = await pool.query(sql, [tenantId, start, end]);
  return rows[0] || {};
};

const getLeaveSummary = async (tenantId, start, end) => {
  const sql = `
    SELECT 
      COUNT(DISTINCT lr.employee_id) as employees_on_leave,
      COUNT(*) as total_requests,
      SUM(CASE WHEN lr.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN lr.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN lr.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(COALESCE(lr.total_days, 0)) as total_leave_days
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE e.tenant_id = $1 AND lr.start_date BETWEEN $2 AND $3
  `;
  const rows = await pool.query(sql, [tenantId, start, end]);
  return rows[0] || {};
};

const getEmployeeHeadcount = async (tenantId, date) => {
  const sql = `
    SELECT COUNT(*) as headcount
    FROM employees e
    WHERE e.tenant_id = $1 AND e.joining_date <= $2 AND (e.exit_date IS NULL OR e.exit_date > $2)
  `;
  const rows = await pool.query(sql, [tenantId, date]);
  return parseInt(rows[0]?.headcount || 0);
};

const getDepartmentBreakdown = async (tenantId, start, end) => {
  const sql = `
    SELECT 
      d.name as department,
      COUNT(DISTINCT e.id) as employee_count,
      SUM(pr.gross_pay) as total_gross,
      SUM(pr.net_pay) as total_net
    FROM payroll_runs pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE e.tenant_id = $1 AND pr.pay_date BETWEEN $2 AND $3
    GROUP BY d.name
    ORDER BY total_gross DESC NULLS LAST
  `;
  return pool.query(sql, [tenantId, start, end]).then(r => r.rows);
};

const getTopEarners = async (tenantId, start, end, limit = 10) => {
  const sql = `
    SELECT 
      e.employee_code,
      u.first_name,
      u.last_name,
      SUM(pr.gross_pay) as total_gross,
      SUM(pr.net_pay) as total_net
    FROM payroll_runs pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE e.tenant_id = $1 AND pr.pay_date BETWEEN $2 AND $3
    GROUP BY e.employee_code, u.first_name, u.last_name
    ORDER BY total_gross DESC
    LIMIT $4
  `;
  return pool.query(sql, [tenantId, start, end, limit]).then(r => r.rows);
};

const generateReport = async (tenantId, prevMonth, currMonth) => {
  const prev = parseMonth(prevMonth);
  const curr = parseMonth(currMonth);
  
  console.log(`\n📊 Month-End Diff Report`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`Previous: ${prev.label} (${prev.start} to ${prev.end})`);
  console.log(`Current:  ${curr.label} (${curr.start} to ${curr.end})`);
  console.log('='.repeat(70));

  const [prevPayroll, currPayroll, prevAttendance, currAttendance, prevLeave, currLeave] = await Promise.all([
    getPayrollSummary(tenantId, prev.start, prev.end),
    getPayrollSummary(tenantId, curr.start, curr.end),
    getAttendanceSummary(tenantId, prev.start, prev.end),
    getAttendanceSummary(tenantId, curr.start, curr.end),
    getLeaveSummary(tenantId, prev.start, prev.end),
    getLeaveSummary(tenantId, curr.start, curr.end),
  ]);

  const prevHeadcount = await getEmployeeHeadcount(tenantId, prev.end);
  const currHeadcount = await getEmployeeHeadcount(tenantId, curr.end);

  console.log('\n👥 HEADCOUNT');
  console.log('-'.repeat(50));
  console.log(`Previous: ${prevHeadcount}`);
  console.log(`Current:  ${currHeadcount}`);
  console.log(`Change:   ${currHeadcount - prevHeadcount >= 0 ? '+' : ''}${currHeadcount - prevHeadcount}`);

  console.log('\n💰 PAYROLL SUMMARY');
  console.log('-'.repeat(70));
  const payrollFields = [
    { key: 'employee_count', label: 'Employees Paid' },
    { key: 'payroll_runs', label: 'Payroll Runs' },
    { key: 'total_gross', label: 'Total Gross', fmt: formatCurrency },
    { key: 'total_net', label: 'Total Net', fmt: formatCurrency },
    { key: 'total_basic', label: 'Total Basic', fmt: formatCurrency },
    { key: 'total_hra', label: 'Total HRA', fmt: formatCurrency },
    { key: 'total_allowances', label: 'Total Allowances', fmt: formatCurrency },
    { key: 'total_employer_statutory', label: 'Employer Statutory', fmt: formatCurrency },
    { key: 'total_employee_deductions', label: 'Employee Deductions', fmt: formatCurrency },
  ];

  for (const f of payrollFields) {
    const prevVal = prevPayroll[f.key] || 0;
    const currVal = currPayroll[f.key] || 0;
    const d = diffValues(prevVal, currVal);
    const valStr = f.fmt ? f.fmt(currVal) : String(currVal);
    console.log(`${f.label.padEnd(30)} ${valStr.padStart(18)} | ${formatDiff(d)}`);
  }

  console.log('\n📅 ATTENDANCE SUMMARY');
  console.log('-'.repeat(70));
  const attFields = [
    { key: 'employees_with_attendance', label: 'Employees with Records' },
    { key: 'total_records', label: 'Total Records' },
    { key: 'present_days', label: 'Present Days' },
    { key: 'absent_days', label: 'Absent Days' },
    { key: 'late_days', label: 'Late Days' },
    { key: 'half_days', label: 'Half Days' },
    { key: 'wfh_days', label: 'WFH Days' },
    { key: 'leave_days', label: 'Leave Days' },
    { key: 'total_overtime_hours', label: 'Overtime Hours', fmt: (v) => `${Number(v).toFixed(1)} hrs` },
  ];

  for (const f of attFields) {
    const prevVal = prevAttendance[f.key] || 0;
    const currVal = currAttendance[f.key] || 0;
    const d = diffValues(prevVal, currVal);
    const valStr = f.fmt ? f.fmt(currVal) : String(currVal);
    console.log(`${f.label.padEnd(30)} ${valStr.padStart(18)} | ${formatDiff(d)}`);
  }

  console.log('\n🏖️ LEAVE SUMMARY');
  console.log('-'.repeat(70));
  const leaveFields = [
    { key: 'employees_on_leave', label: 'Employees on Leave' },
    { key: 'total_requests', label: 'Total Requests' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'total_leave_days', label: 'Total Leave Days' },
  ];

  for (const f of leaveFields) {
    const prevVal = prevLeave[f.key] || 0;
    const currVal = currLeave[f.key] || 0;
    const d = diffValues(prevVal, currVal);
    console.log(`${f.label.padEnd(30)} ${String(currVal).padStart(18)} | ${formatDiff(d)}`);
  }

  // Department breakdown
  console.log('\n🏢 DEPARTMENT BREAKDOWN (Current Month)');
  console.log('-'.repeat(70));
  const deptBreakdown = await getDepartmentBreakdown(tenantId, curr.start, curr.end);
  console.log(`${'Department'.padEnd(25)} ${'Employees'.padStart(12)} ${'Gross Pay'.padStart(18)} ${'Net Pay'.padStart(18)}`);
  console.log('-'.repeat(70));
  for (const d of deptBreakdown) {
    console.log(`${d.department.padEnd(25)} ${String(d.employee_count).padStart(12)} ${formatCurrency(d.total_gross).padStart(18)} ${formatCurrency(d.total_net).padStart(18)}`);
  }

  // Top earners
  console.log('\n🏆 TOP 10 EARNERS (Current Month)');
  console.log('-'.repeat(70));
  const topEarners = await getTopEarners(tenantId, curr.start, curr.end, 10);
  console.log(`${'Employee'.padEnd(25)} ${'Gross'.padStart(18)} ${'Net'.padStart(18)}`);
  console.log('-'.repeat(70));
  for (const e of topEarners) {
    const name = `${e.first_name} ${e.last_name} (${e.employee_code})`;
    console.log(`${name.padEnd(25)} ${formatCurrency(e.total_gross).padStart(18)} ${formatCurrency(e.total_net).padStart(18)}`);
  }

  // Save JSON report
  const report = {
    tenantId,
    previousMonth: prev.label,
    currentMonth: curr.label,
    generatedAt: new Date().toISOString(),
    headcount: { previous: prevHeadcount, current: currHeadcount },
    payroll: { previous: prevPayroll, current: currPayroll },
    attendance: { previous: prevAttendance, current: currAttendance },
    leave: { previous: prevLeave, current: currLeave },
    departmentBreakdown: deptBreakdown,
    topEarners,
  };

  const reportDir = path.join(__dirname, '../reports/month-end-diff');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `${tenantId}-${curr.label}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved: ${reportFile}`);

  return report;
};

const main = async () => {
  const [tenantId, prevMonth, currMonth] = process.argv.slice(2);
  
  if (!tenantId) {
    console.error('Usage: node scripts/month-end-diff.js <tenantId> [prevMonth] [currMonth]');
    console.log('Example: node scripts/month-end-diff.js tenant-123 2024-01 2024-02');
    process.exit(1);
  }

  const { prev, curr } = getCurrentAndPrevMonth();
  const prevMonthStr = prevMonth || `${prev.year}-${String(prev.month).padStart(2, '0')}`;
  const currMonthStr = currMonth || `${curr.year}-${String(curr.month).padStart(2, '0')}`;

  try {
    await generateReport(tenantId, prevMonthStr, currMonthStr);
    console.log('\n✅ Month-end diff completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();