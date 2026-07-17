const express = require('express');
const router = express.Router();

const verifyJwt = require('../../middleware/verifyJwt');

// All sub-module routers and services are lazy-loaded in their use/handler functions

const requirePermission = require('../../middleware/requirePermission');

// ===================================================================
// MOUNT SUB-MODULE ROUTERS (lazy-loaded)
// ===================================================================
router.use('/river', (req, res, next) => { require('./river/river.controller')(req, res, next); });
router.use('/salary', (req, res, next) => { require('./salary/salary.router')(req, res, next); });
router.use('/salary-structures', (req, res, next) => { require('./salary/salaryStructure.router')(req, res, next); });
router.use('/payrun', (req, res, next) => { require('./payrun/payrun.router')(req, res, next); });
router.use('/statutory', (req, res, next) => { require('./statutory/statutory.router')(req, res, next); });
router.use('/settlement', (req, res, next) => { require('./settlement/settlement.router')(req, res, next); });
router.use('/consultants', (req, res, next) => { require('./consultant/consultant.router')(req, res, next); });
router.use('/payslips', (req, res, next) => { require('./payslip/payslip.router')(req, res, next); });
router.use('/expenses', (req, res, next) => { require('./Expenses/expenses.router')(req, res, next); });
router.use('/loans', (req, res, next) => { require('./loans/loans.router')(req, res, next); });
router.use('/merchants', (req, res, next) => { require('./Merchants/Merchants.router')(req, res, next); });
router.use('/tax', (req, res, next) => { require('./tax/tax.router')(req, res, next); });
router.use('/arrears', (req, res, next) => { require('./arrears/arrears.router')(req, res, next); });

// ===================================================================
// PAYROLL SUMMARY (Dashboard Data)
// ===================================================================
router.get('/summary', verifyJwt, requirePermission('payroll', 'view_dashboard'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get employee count
    const employeesRes = await require('../../config/db').query(
      `SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND status = 'ACTIVE'`,
      [tenantId]
    );
    const totalEmployees = parseInt(employeesRes.rows[0].count || 0);

    // Get salary details count
    const salaryRes = await require('../../config/db').query(
      `SELECT COALESCE(SUM(ctc/12), 0) as monthly_payroll 
       FROM employee_salary_details 
       WHERE tenant_id = $1 AND is_current = TRUE`,
      [tenantId]
    );
    const monthlyPayroll = parseFloat(salaryRes.rows[0].monthly_payroll || 0);

    // Get pending payslips
    const payslipsRes = await require('../../config/db').query(
      `SELECT COUNT(*) FROM payroll_run_items pri
       JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
       WHERE pri.tenant_id = $1 AND pr.status IN ('DRAFT', 'PENDING_APPROVAL')`,
      [tenantId]
    );
    const pendingPayslips = parseInt(payslipsRes.rows[0].count || 0);

    // Get pending reimbursement claims
    const reimbRes = await require('../../config/db').query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM reimbursement_claims
       WHERE tenant_id = $1 AND status = 'PENDING'`,
      [tenantId]
    );
    const reimbursements = parseFloat(reimbRes.rows[0].total || 0);

    // Get active loans
    const loansRes = await require('../../config/db').query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total FROM employee_loans 
       WHERE tenant_id = $1 AND status = 'ACTIVE'`,
      [tenantId]
    );
    const activeLoans = parseFloat(loansRes.rows[0].total || 0);

    res.json({
      status: 'success',
      data: {
        total_employees: totalEmployees,
        monthly_payroll: monthlyPayroll,
        pending_payslips: pendingPayslips,
        reimbursements: reimbursements,
        active_loans: activeLoans
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Payroll summary error:', err);
    // eslint-disable-next-line no-console
    console.error('User:', req.user); // Debug user context
    res.status(500).json({ status: 'error', message: 'Failed to fetch payroll summary', error: err.message });
  }
});

// ===================================================================
// LEGACY ENDPOINTS (Backward compatibility)
// ===================================================================

// Salary Components (redirect to salary.service or return placeholder)
router.get('/salary-components', verifyJwt, async (req, res) => {
  try {
    const salaryService = require('./salary/salary.service');
    const templates = await salaryService.getTemplates(req.user.tenantId);
    res.json({ status: 'success', data: templates });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Cost Centers (redirect to statutory)
router.get('/cost-centers', verifyJwt, async (req, res) => {
  try {
    const statutoryService = require('./statutory/statutory.service');
    const data = await statutoryService.getCostCentres(req.user.tenantId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

router.post('/cost-centers', verifyJwt, requirePermission('payroll', 'manage_statutory'), async (req, res) => {
  try {
    const statutoryService = require('./statutory/statutory.service');
    const data = await statutoryService.createCostCentre(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Pay Schedules
router.get('/schedules', verifyJwt, async (req, res) => {
  try {
    const payrunService = require('./payrun/payrun.service');
    const data = await payrunService.getSchedules(req.user.tenantId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Deductions
router.get('/deductions', verifyJwt, async (req, res) => {
  try {
    const statutoryService = require('./statutory/statutory.service');
    const data = await statutoryService.getDeductionTypes(req.user.tenantId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

router.get('/deduction-types', verifyJwt, async (req, res) => {
  try {
    const statutoryService = require('./statutory/statutory.service');
    const data = await statutoryService.getDeductionTypes(req.user.tenantId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Salary Revisions
router.get('/salary-revisions', verifyJwt, async (req, res) => {
  try {
    const salaryService = require('./salary/salary.service');
    const data = await salaryService.getRevisions(req.user.tenantId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Income Tax
router.get('/income-tax', verifyJwt, async (req, res) => {
  // Return statutory config for now
  try {
    const statutoryService = require('./statutory/statutory.service');
    const data = await statutoryService.getStatutoryConfig(req.user.tenantId);
    res.json({ status: 'success', data: data || {} });
  } catch (err) {
    res.json({ status: 'success', data: {} });
  }
});

// Payslips (from payroll run items)
router.get('/payslips', verifyJwt, async (req, res) => {
  try {
    const db = require('../../config/db');
    const result = await db.query(
      `SELECT pri.*, pr.period_month, pr.period_year, pr.status as payrun_status,
              e.first_name, e.last_name, e.employee_id as emp_code
       FROM payroll_run_items pri
       JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
       JOIN employees e ON e.id = pri.employee_id
       WHERE pri.tenant_id = $1 ${!['ADMIN', 'HR'].includes(req.user.role) ? 'AND pri.employee_id = $2' : ''}
       ORDER BY pr.period_year DESC, pr.period_month DESC
       LIMIT 100`,
      !['ADMIN', 'HR'].includes(req.user.role) ? [req.user.tenantId, req.user.employeeId] : [req.user.tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Transactions (legacy)
router.get('/transactions', verifyJwt, async (req, res) => {
  res.json({ status: 'success', data: [] });
});

// Project Allocations
router.get('/project-allocations', verifyJwt, async (req, res) => {
  try {
    // Stub implementation to fix 404
    res.json({ status: 'success', data: [] });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

// Cost Center Reports
router.get('/cost-center-reports', verifyJwt, async (req, res) => {
  try {
    // Stub implementation to fix 404
    res.json({ status: 'success', data: [] });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

router.get('/salary-structure', verifyJwt, async (req, res) => {
  try {
    if (req.user.employeeId) {
      const salaryService = require('./salary/salary.service');
      const data = await salaryService.getEmployeeSalary(req.user.tenantId, req.user.employeeId);
      res.json({ status: 'success', data: data || null });
    } else {
      res.json({ status: 'success', data: null });
    }
  } catch (err) {
    res.json({ status: 'success', data: null });
  }
});

module.exports = router;
