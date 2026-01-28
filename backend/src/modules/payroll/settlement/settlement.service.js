const db = require("../../../config/db");

// ===================================================================
// REIMBURSEMENTS
// ===================================================================

const createReimbursement = async (tenantId, employeeId, userId, payload) => {
    const { category, amount, claimDate, description, isTaxable, receiptUrl } = payload;

    // Validate positive amount
    if (amount <= 0) {
        throw new Error('Reimbursement amount must be positive');
    }

    // Validate claim date is not in future
    if (new Date(claimDate) > new Date()) {
        throw new Error('Claim date cannot be in the future');
    }

    const result = await db.query(
        `INSERT INTO reimbursement_claims (
      tenant_id, employee_id, reimbursement_type_id, amount, claim_date, 
      description, receipt_url, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
        [
            tenantId, employeeId, payload.reimbursementTypeId, amount, claimDate,
            description || null, receiptUrl || null, userId
        ]
    );

    return result.rows[0];
};

const getReimbursements = async (tenantId, filters = {}) => {
    let query = `
    SELECT r.*, e.first_name, e.last_name, e.employee_id as emp_code, rt.name as category_name
    FROM reimbursement_claims r
    JOIN employees e ON e.id = r.employee_id
    LEFT JOIN reimbursement_types rt ON rt.id = r.reimbursement_type_id
    WHERE r.tenant_id = $1
  `;
    const params = [tenantId];
    let idx = 2;

    if (filters.employeeId) {
        query += ` AND r.employee_id = $${idx++}`;
        params.push(filters.employeeId);
    }

    if (filters.status) {
        query += ` AND r.status = $${idx++}`;
        params.push(filters.status);
    }

    if (filters.category) {
        query += ` AND r.category = $${idx++}`;
        params.push(filters.category);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

const getMyReimbursements = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT r.*, rt.name as category_name 
     FROM reimbursement_claims r
     LEFT JOIN reimbursement_types rt ON rt.id = r.reimbursement_type_id
     WHERE r.tenant_id = $1 AND r.employee_id = $2 
     ORDER BY r.created_at DESC`,
        [tenantId, employeeId]
    );
    return result.rows;
};

const approveReimbursement = async (tenantId, reimbursementId, userId, status, includeInPayroll = false) => {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        throw new Error('Invalid status');
    }

    const result = await db.query(
        `UPDATE reimbursement_claims 
     SET status = $1, approved_by = $2, approved_at = now()
     WHERE tenant_id = $3 AND id = $4 AND status = 'PENDING'
     RETURNING *`,
        [status, userId, tenantId, reimbursementId]
    );

    if (result.rowCount === 0) {
        throw new Error('Reimbursement not found or already processed');
    }

    return result.rows[0];
};

const markReimbursementPaid = async (tenantId, reimbursementId, payrollRunId) => {
    const result = await db.query(
        `UPDATE reimbursement_claims 
     SET status = 'PAID', paid_in_payrun_id = $1
     WHERE tenant_id = $2 AND id = $3 AND status = 'APPROVED'
     RETURNING *`,
        [payrollRunId, tenantId, reimbursementId]
    );
    return result.rows[0];
};

// ===================================================================
// FULL & FINAL SETTLEMENT
// ===================================================================

const createFnFSettlement = async (tenantId, userId, payload) => {
    const { employeeId, lastWorkingDay, resignationDate } = payload;

    // Check for existing F&F settlement
    const existingFnF = await db.query(
        `SELECT id, status FROM fnf_settlements 
         WHERE tenant_id = $1 AND employee_id = $2 AND status NOT IN ('CANCELLED')`,
        [tenantId, employeeId]
    );

    if (existingFnF.rowCount > 0) {
        throw new Error(`F&F settlement already exists for this employee (Status: ${existingFnF.rows[0].status})`);
    }

    // Get employee's current salary assignment
    const salaryRes = await db.query(
        `SELECT esa.id as assignment_id, esa.annual_ctc as ctc
     FROM employee_salary_assignments esa
     WHERE esa.tenant_id = $1 AND esa.employee_id = $2 AND esa.is_current = TRUE`,
        [tenantId, employeeId]
    );
    const assignment = salaryRes.rows[0];
    const ctc = assignment ? parseFloat(assignment.ctc || 0) : 0;
    const perDaySalary = ctc / 12 / 30; // Simplified calculation for settlement baseline

    // Get pending loans
    const loansRes = await db.query(
        `SELECT SUM(outstanding_amount) as total 
     FROM employee_loans 
     WHERE tenant_id = $1 AND employee_id = $2 AND status = 'ACTIVE'`,
        [tenantId, employeeId]
    );
    const loanRecovery = parseFloat(loansRes.rows[0]?.total || 0);

    // Get pending reimbursement claims
    const reimbRes = await db.query(
        `SELECT SUM(amount) as total 
     FROM reimbursement_claims 
     WHERE tenant_id = $1 AND employee_id = $2 AND status = 'APPROVED' AND paid_in_payrun_id IS NULL`,
        [tenantId, employeeId]
    );
    const reimbursementsPending = parseFloat(reimbRes.rows[0]?.total || 0);

    // Get leave balance for encashment
    const leaveRes = await db.query(
        `SELECT SUM(lb.current_balance) as total_days
     FROM leave_balances lb
     JOIN leave_types lt ON lt.id = lb.leave_type_id
     WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lt.is_encashable = TRUE`,
        [tenantId, employeeId]
    );
    const encashableDays = parseFloat(leaveRes.rows[0]?.total_days || 0);
    const leaveEncashment = encashableDays * perDaySalary;

    // Calculate pending salary (simplified - days from last payroll to LWD)
    const pendingSalary = ctc / 12; // Full month for now

    // Calculate gratuity (5 years = 15 days salary per year)
    // Simplified: (basic * 15/26) * years_of_service
    const gratuity = 0; // TODO: Calculate based on join date

    const grossPayable = pendingSalary + leaveEncashment + gratuity + reimbursementsPending;
    const totalDeductions = loanRecovery;
    const netPayable = grossPayable - totalDeductions;

    const result = await db.query(
        `INSERT INTO fnf_settlements (
      tenant_id, employee_id, last_working_day, resignation_date,
      pending_salary, leave_encashment, gratuity, reimbursements_pending,
      gross_payable, loan_recovery, total_deductions, net_payable,
      status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'DRAFT', $13)
    RETURNING *`,
        [
            tenantId, employeeId, lastWorkingDay, resignationDate || null,
            pendingSalary, leaveEncashment, gratuity, reimbursementsPending,
            grossPayable, loanRecovery, totalDeductions, netPayable,
            userId
        ]
    );

    return result.rows[0];
};

const getFnFSettlements = async (tenantId, filters = {}) => {
    let query = `
    SELECT f.*, e.first_name, e.last_name, e.employee_id as emp_code
    FROM fnf_settlements f
    JOIN employees e ON e.id = f.employee_id
    WHERE f.tenant_id = $1
  `;
    const params = [tenantId];
    let idx = 2;

    if (filters.status) {
        query += ` AND f.status = $${idx++}`;
        params.push(filters.status);
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

const getFnFSettlementById = async (tenantId, settlementId) => {
    const result = await db.query(
        `SELECT f.*, e.first_name, e.last_name, e.employee_id as emp_code
     FROM fnf_settlements f
     JOIN employees e ON e.id = f.employee_id
     WHERE f.tenant_id = $1 AND f.id = $2`,
        [tenantId, settlementId]
    );
    return result.rows[0];
};

const updateFnFSettlement = async (tenantId, settlementId, payload) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMap = {
        pendingSalary: 'pending_salary',
        leaveEncashment: 'leave_encashment',
        gratuity: 'gratuity',
        bonusPending: 'bonus_pending',
        reimbursementsPending: 'reimbursements_pending',
        otherEarnings: 'other_earnings',
        noticePeriodRecovery: 'notice_period_recovery',
        loanRecovery: 'loan_recovery',
        advanceRecovery: 'advance_recovery',
        itAssetsRecovery: 'it_assets_recovery',
        tdsOnFnf: 'tds_on_fnf',
        otherRecoveries: 'other_recoveries',
        remarks: 'remarks'
    };

    for (const key of Object.keys(payload)) {
        if (columnMap[key] !== undefined) {
            fields.push(`${columnMap[key]} = $${idx++}`);
            values.push(payload[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = now()`);
    values.push(tenantId, settlementId);

    const result = await db.query(
        `UPDATE fnf_settlements SET ${fields.join(', ')}
     WHERE tenant_id = $${idx++} AND id = $${idx} AND status = 'DRAFT'
     RETURNING *`,
        values
    );

    if (result.rowCount > 0) {
        // Recalculate totals
        const fnf = result.rows[0];
        const grossPayable =
            parseFloat(fnf.pending_salary || 0) +
            parseFloat(fnf.leave_encashment || 0) +
            parseFloat(fnf.gratuity || 0) +
            parseFloat(fnf.bonus_pending || 0) +
            parseFloat(fnf.reimbursements_pending || 0) +
            parseFloat(fnf.other_earnings || 0);

        const totalDeductions =
            parseFloat(fnf.notice_period_recovery || 0) +
            parseFloat(fnf.loan_recovery || 0) +
            parseFloat(fnf.advance_recovery || 0) +
            parseFloat(fnf.it_assets_recovery || 0) +
            parseFloat(fnf.tds_on_fnf || 0) +
            parseFloat(fnf.other_recoveries || 0);

        await db.query(
            `UPDATE fnf_settlements 
       SET gross_payable = $1, total_deductions = $2, net_payable = $3
       WHERE id = $4`,
            [grossPayable, totalDeductions, grossPayable - totalDeductions, settlementId]
        );
    }

    return await getFnFSettlementById(tenantId, settlementId);
};

const approveFnFSettlement = async (tenantId, settlementId, userId, status) => {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        throw new Error('Invalid status');
    }

    const newStatus = status === 'APPROVED' ? 'APPROVED' : 'DRAFT';

    const result = await db.query(
        `UPDATE fnf_settlements 
     SET status = $1, approved_by = $2, approved_at = now(), updated_at = now()
     WHERE tenant_id = $3 AND id = $4 AND status = 'PENDING_APPROVAL'
     RETURNING *`,
        [newStatus, userId, tenantId, settlementId]
    );

    if (result.rowCount === 0) {
        throw new Error('Settlement not found or not pending approval');
    }

    return result.rows[0];
};

const submitFnFForApproval = async (tenantId, settlementId) => {
    const result = await db.query(
        `UPDATE fnf_settlements 
     SET status = 'PENDING_APPROVAL', updated_at = now()
     WHERE tenant_id = $1 AND id = $2 AND status = 'DRAFT'
     RETURNING *`,
        [tenantId, settlementId]
    );

    if (result.rowCount === 0) {
        throw new Error('Settlement not found or not in draft');
    }

    return result.rows[0];
};

const markFnFPaid = async (tenantId, settlementId, userId) => {
    const result = await db.query(
        `UPDATE fnf_settlements 
     SET status = 'PAID', paid_at = now(), updated_at = now()
     WHERE tenant_id = $1 AND id = $2 AND status = 'APPROVED'
     RETURNING *`,
        [tenantId, settlementId]
    );

    if (result.rowCount === 0) {
        throw new Error('Settlement not found or not approved');
    }

    // Update employee status to TERMINATED
    const fnf = result.rows[0];
    await db.query(
        `UPDATE employees SET status = 'TERMINATED', updated_at = now() WHERE id = $1`,
        [fnf.employee_id]
    );

    return result.rows[0];
};

module.exports = {
    // Reimbursements
    createReimbursement,
    getReimbursements,
    getMyReimbursements,
    approveReimbursement,
    markReimbursementPaid,

    // F&F Settlement
    createFnFSettlement,
    getFnFSettlements,
    getFnFSettlementById,
    updateFnFSettlement,
    approveFnFSettlement,
    submitFnFForApproval,
    markFnFPaid
};
