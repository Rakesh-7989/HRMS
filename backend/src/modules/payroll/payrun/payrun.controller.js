const pool = require('../../../config/db');

const getQuery = (db) => (db && typeof db.query === 'function' ? db.query : pool.query.bind(pool));

exports.getSummary = async (db, tenantId) => {
    const query = getQuery(db);

    const totalEmployeesRes = await query(`SELECT COUNT(*) FROM employees WHERE tenant_id = $1`, [tenantId]);
    const totalEmployees = Number(totalEmployeesRes.rows[0].count || 0);

    const monthlyPayrollRes = await query(
        `SELECT COALESCE(total_net, 0) AS total
     FROM payroll_runs
     WHERE tenant_id = $1 AND status IN ('APPROVED', 'PAID')
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
        [tenantId]
    );
    const monthlyPayroll = Number(monthlyPayrollRes.rows[0]?.total || 0);

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


const payrunService = require("./payrun.service");

// Pay Schedules
const createSchedule = async (req, res) => {
    try {
        const data = await payrunService.createSchedule(req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[createSchedule]', err.message);
        res.status(500).json({ status: "error", message: err.message || "Failed to create schedule" });
    }
};

const getSchedules = async (req, res) => {
    try {
        const data = await payrunService.getSchedules(req.user.tenantId);
        res.json({ status: "success", data });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[getSchedules]', err.message);
        res.status(500).json({ status: "error", message: err.message || "Failed to fetch schedules" });
    }
};

// Payroll Runs
const createPayrun = async (req, res) => {
    try {
        const data = await payrunService.createPayrun(req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[createPayrun]', err.message);
        res.status(err.message?.includes('already exists') ? 409 : 500).json({ status: "error", message: err.message || "Failed to create payrun" });
    }
};

const getPayruns = async (req, res) => {
    try {
        const data = await payrunService.getPayruns(req.user.tenantId, req.query);
        res.json({ status: "success", data });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[getPayruns]', err.message);
        res.status(500).json({ status: "error", message: err.message || "Failed to fetch payruns" });
    }
};

const getPayrunById = async (req, res) => {
    try {
        const payrun = await payrunService.getPayrunById(req.user.tenantId, req.params.id);
        if (!payrun) {
            return res.status(404).json({ status: "error", message: "Payrun not found" });
        }
        const items = await payrunService.getPayrunItems(req.user.tenantId, req.params.id);
        res.json({ status: "success", data: { ...payrun, items } });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[getPayrunById]', err.message);
        res.status(500).json({ status: "error", message: err.message || "Failed to fetch payrun" });
    }
};

const calculatePayrun = async (req, res) => {
    try {
        const data = await payrunService.calculatePayrun(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Payroll calculated successfully" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[calculatePayrun]', err.message);
        res.status(500).json({ status: "error", message: err.message || "Failed to calculate payrun" });
    }
};

const approvePayrun = async (req, res) => {
    try {
        const data = await payrunService.approvePayrun(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Payroll approved" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[approvePayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to approve payrun" });
    }
};

const rejectPayrun = async (req, res) => {
    try {
        const data = await payrunService.rejectPayrun(
            req.user.tenantId,
            req.params.id,
            req.user.id,
            req.body.reason
        );
        res.json({ status: "success", data, message: "Payroll rejected" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[rejectPayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to reject payrun" });
    }
};

const revokePayrun = async (req, res) => {
    try {
        const data = await payrunService.revokePayrun(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Payroll revoked" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[revokePayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to revoke payrun" });
    }
};

const deletePayrun = async (req, res) => {
    try {
        const data = await payrunService.deletePayrun(req.user.tenantId, req.params.id);
        res.json({ status: "success", data });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[deletePayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to delete payrun" });
    }
};

const voidPayrun = async (req, res) => {
    try {
        const data = await payrunService.voidPayrun(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Payrun voided successfully" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[voidPayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to void payrun" });
    }
};

const deletePayslipItem = async (req, res) => {
    try {
        const data = await payrunService.deletePayslipItem(req.user.tenantId, req.params.id, req.params.itemId);
        res.json({ status: "success", data, message: "Payslip deleted successfully" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[deletePayslipItem]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to delete payslip item" });
    }
};

const lockPayrun = async (req, res) => {
    try {
        const data = await payrunService.lockPayrun(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Payroll locked" });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[lockPayrun]', err.message);
        res.status(400).json({ status: "error", message: err.message || "Failed to lock payrun" });
    }
};

module.exports = {
    createSchedule,
    getSchedules,
    createPayrun,
    getPayruns,
    getPayrunById,
    calculatePayrun,
    approvePayrun,
    rejectPayrun,
    revokePayrun,
    deletePayrun,
    voidPayrun,
    deletePayslipItem,
    lockPayrun
};

