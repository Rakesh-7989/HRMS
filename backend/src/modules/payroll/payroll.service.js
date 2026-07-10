const pool = require('../../config/db');
const timeService = require("../../utils/timeService");

const getQuery = (db) => (db && typeof db.query === 'function' ? db.query : pool.query.bind(pool));

exports.getSummary = async (db, tenantId) => {
  const query = getQuery(db);

  // Consolidated query using CTEs for atomic snapshot and better performance
  const summaryQuery = `
    WITH 
      emp_count AS (
        SELECT COUNT(*) as count FROM employees WHERE tenant_id = $1
      ),
      payroll_total AS (
        SELECT COALESCE(total_net, 0) as total
        FROM payroll_runs
        WHERE tenant_id = $1 AND status IN ('APPROVED', 'PAID')
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      ),
      pending_payslips AS (
        SELECT COUNT(*) as count 
        FROM payroll_payslips 
        WHERE tenant_id = $1 AND status = 'PENDING'
      ),
      reimbursements AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payroll_expenses 
        WHERE tenant_id = $1
      ),
      loan_summary AS (
        SELECT 
          COALESCE(SUM(amount), 0) as total_loans,
          COALESCE(SUM(outstanding), 0) as active_loans
        FROM payroll_loans 
        WHERE tenant_id = $1
      )
    SELECT 
      (SELECT count FROM emp_count) as total_employees,
      (SELECT total FROM payroll_total) as monthly_payroll,
      (SELECT count FROM pending_payslips) as pending_payslips,
      (SELECT total FROM reimbursements) as reimbursements,
      (SELECT total_loans FROM loan_summary) as loans,
      (SELECT active_loans FROM loan_summary) as active_loans
  `;

  const res = await query(summaryQuery, [tenantId]);
  const row = res.rows[0];

  return {
    total_employees: Number(row.total_employees || 0),
    monthly_payroll: Number(row.monthly_payroll || 0),
    pending_payslips: Number(row.pending_payslips || 0),
    reimbursements: Number(row.reimbursements || 0),
    loans: Number(row.loans || 0),
    active_loans: Number(row.active_loans || 0),
  };
};

exports.listSalaryComponents = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(`SELECT id, name, amount, created_at FROM payroll_salary_components WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  return res.rows;
};

exports.createSalaryComponent = async (db, tenantId, payload) => {
  const query = getQuery(db);
  const res = await query(
    `INSERT INTO payroll_salary_components (tenant_id, name, amount, created_by) VALUES ($1,$2,$3,$4) RETURNING id, name, amount, created_at`,
    [tenantId, payload.name, payload.amount, payload.created_by || null]
  );
  return res.rows[0];
};

exports.listExpenses = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(`SELECT id, category, amount, expense_date, created_at FROM payroll_expenses WHERE tenant_id = $1 ORDER BY expense_date DESC, created_at DESC`, [tenantId]);
  return res.rows;
};

exports.createExpense = async (db, tenantId, payload) => {
  const query = getQuery(db);
  const tz = await timeService.getEffectiveTz(query, tenantId);
  const today = timeService.todayDate(tz);
  const res = await query(
    `INSERT INTO payroll_expenses (tenant_id, category, amount, expense_date, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, category, amount, expense_date, created_at`,
    [tenantId, payload.category, payload.amount, payload.expense_date || today, payload.created_by || null]
  );
  return res.rows[0];
};

exports.listLoans = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(`SELECT id, employee_id, employee_name, amount, outstanding, created_at FROM payroll_loans WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
  return res.rows;
};

exports.createLoan = async (db, tenantId, payload) => {
  const query = getQuery(db);
  const res = await query(
    `INSERT INTO payroll_loans (tenant_id, employee_id, employee_name, amount, outstanding, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, employee_id, employee_name, amount, outstanding, created_at`,
    [tenantId, payload.employee_id || null, payload.employee_name || null, payload.amount, payload.outstanding ?? payload.amount, payload.created_by || null]
  );
  return res.rows[0];
};

exports.listTransactions = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(`SELECT id, employee_id, type, amount, tx_date, created_at FROM payroll_transactions WHERE tenant_id = $1 ORDER BY tx_date DESC, created_at DESC LIMIT 100`, [tenantId]);
  return res.rows;
};

exports.createTransaction = async (db, tenantId, payload) => {
  const query = getQuery(db);
  const tz = await timeService.getEffectiveTz(query, tenantId);
  const today = timeService.todayDate(tz);
  const res = await query(`INSERT INTO payroll_transactions (tenant_id, employee_id, type, amount, tx_date, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, employee_id, type, amount, tx_date, created_at`, [tenantId, payload.employee_id || null, payload.type, payload.amount, payload.tx_date || today, payload.created_by || null]);
  return res.rows[0];
};
