const pool = require('../../config/db');

const getQuery = (db) => (db && typeof db.query === 'function' ? db.query : pool.query.bind(pool));

exports.getSummary = async (db, tenantId) => {
  const query = getQuery(db);

  const totalEmployeesRes = await query(`SELECT COUNT(*) FROM employees WHERE tenant_id = $1`, [tenantId]);
  const totalEmployees = Number(totalEmployeesRes.rows[0].count || 0);

  const monthlyPayrollRes = await query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM payroll_salary_components WHERE tenant_id = $1`,
    [tenantId]
  );
  const monthlyPayroll = Number(monthlyPayrollRes.rows[0].total || 0);

  const pendingPayslipsRes = await query(
    `SELECT COUNT(*) FROM payroll_payslips WHERE tenant_id = $1 AND status = 'PENDING'`,
    [tenantId]
  );
  const pendingPayslips = Number(pendingPayslipsRes.rows[0].count || 0);

  const reimbursementsRes = await query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM payroll_expenses WHERE tenant_id = $1`,
    [tenantId]
  );
  const reimbursements = Number(reimbursementsRes.rows[0].total || 0);

  const loansRes = await query(`SELECT COALESCE(SUM(amount),0) AS total FROM payroll_loans WHERE tenant_id = $1`, [tenantId]);
  const loans = Number(loansRes.rows[0].total || 0);

  const activeLoansRes = await query(`SELECT COALESCE(SUM(outstanding),0) AS total FROM payroll_loans WHERE tenant_id = $1`, [tenantId]);
  const active_loans = Number(activeLoansRes.rows[0].total || 0);

  return {
    total_employees: totalEmployees,
    monthly_payroll: monthlyPayroll,
    pending_payslips: pendingPayslips,
    reimbursements: reimbursements,
    loans,
    active_loans,
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
  const res = await query(
    `INSERT INTO payroll_expenses (tenant_id, category, amount, expense_date, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, category, amount, expense_date, created_at`,
    [tenantId, payload.category, payload.amount, payload.expense_date || new Date(), payload.created_by || null]
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
  const res = await query(`INSERT INTO payroll_transactions (tenant_id, employee_id, type, amount, tx_date, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, employee_id, type, amount, tx_date, created_at`, [tenantId, payload.employee_id || null, payload.type, payload.amount, payload.tx_date || new Date(), payload.created_by || null]);
  return res.rows[0];
};
