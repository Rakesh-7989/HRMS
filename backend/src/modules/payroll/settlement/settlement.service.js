const db = require("../../../config/db");
const inboxService = require("../../inbox/inbox.service");

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

    const created = result.rows[0];

    // Notify admin/HR: new reimbursement submitted
    try {
        const empRes = await db.query(
            `SELECT first_name, last_name FROM employees WHERE id = $1`, [employeeId]
        );
        const emp = empRes.rows[0];
        const hrUsers = await db.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('HR','ADMIN') AND id != $2`, [tenantId, userId]
        );
        for (const hr of hrUsers.rows) {
            await inboxService.createNotification(db, {
                tenant_id: tenantId, user_id: hr.id,
                title: 'New Reimbursement Claim',
                message: `${emp?.first_name} ${emp?.last_name} submitted a reimbursement of ₹${amount}`,
                type: 'info', link: '/payroll/settlement'
            });
        }
    } catch (notifErr) {
        console.error('Reimbursement create notification error:', notifErr.message);
    }

    return created;
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

    const updated = result.rows[0];

    // Notify employee: reimbursement approved/rejected
    try {
        const empUserRes = await db.query(
            `SELECT user_id FROM employees WHERE id = $1`, [updated.employee_id]
        );
        if (empUserRes.rows[0]) {
            const isApproved = status === 'APPROVED';
            await inboxService.createNotification(db, {
                tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
                title: isApproved ? 'Reimbursement Approved ✅' : 'Reimbursement Rejected',
                message: isApproved
                    ? `Your reimbursement of ₹${updated.amount} has been approved.`
                    : `Your reimbursement of ₹${updated.amount} was rejected.`,
                type: isApproved ? 'success' : 'warning', link: '/payroll/settlement'
            });
        }
    } catch (notifErr) {
        console.error('Reimbursement approve notification error:', notifErr.message);
    }

    return updated;
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
    try {
        const { employeeId, lastWorkingDay, resignationDate } = payload;

        // Helper: Robust Date Parser
        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
            // Fallback for DD-MM-YYYY
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            return null;
        };

        const lwdDate = parseDate(lastWorkingDay);
        if (!lwdDate || isNaN(lwdDate.getTime())) {
            throw new Error(`Invalid Last Working Day format: ${lastWorkingDay}`);
        }

        // Check for existing F&F settlement
        const existingFnF = await db.query(
            `SELECT id, status FROM fnf_settlements 
         WHERE tenant_id = $1 AND employee_id = $2 AND status NOT IN ('CANCELLED')`,
            [tenantId, employeeId]
        );

        if (existingFnF.rowCount > 0) {
            throw new Error(`F&F settlement already exists for this employee (Status: ${existingFnF.rows[0].status})`);
        }

        // Get employee details including join_date for gratuity
        const empRes = await db.query(
            `SELECT id, join_date, first_name, last_name FROM employees WHERE tenant_id = $1 AND id = $2`,
            [tenantId, employeeId]
        );
        const employee = empRes.rows[0];
        if (!employee) {
            throw new Error('Employee not found');
        }

        // Get employee's current salary assignment + component breakdown
        const salaryRes = await db.query(
            `SELECT esa.id as assignment_id, esa.annual_ctc as ctc
     FROM employee_salary_assignments esa
     WHERE esa.tenant_id = $1 AND esa.employee_id = $2 AND esa.is_current = TRUE`,
            [tenantId, employeeId]
        );
        const assignment = salaryRes.rows[0];
        const ctc = assignment ? parseFloat(assignment.ctc || 0) : 0;
        const perDaySalary = ctc / 12 / 30;

        // Fetch the BASIC + DA component amounts for gratuity calculation
        let monthlyBasic = 0;
        let monthlyDA = 0;
        if (assignment) {
            const basicRes = await db.query(
                `SELECT escv.monthly_amount, sc.code
                 FROM employee_salary_component_values escv
                 JOIN salary_components sc ON sc.id = escv.component_id
                 WHERE escv.assignment_id = $1 AND sc.code IN ('BASIC', 'DA')`,
                [assignment.assignment_id]
            );
            basicRes.rows.forEach(row => {
                if (row.code === 'BASIC') monthlyBasic = parseFloat(row.monthly_amount || 0);
                if (row.code === 'DA') monthlyDA = parseFloat(row.monthly_amount || 0);
            });
        }

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

        // Calculate pending salary (Pro-rata based on LWD)
        const daysInMonth = new Date(lwdDate.getFullYear(), lwdDate.getMonth() + 1, 0).getDate();
        const workingDays = lwdDate.getDate(); // Assuming full attendance until LWD for now (Attendance integration is separate)
        const pendingSalary = (ctc / 12) * (workingDays / daysInMonth);

        // =====================================================
        // DYNAMIC GRATUITY CALCULATION (Payment of Gratuity Act, 1972)
        // Formula: (15 × last drawn salary × years of service) / 26
        // Last drawn salary = Basic + DA (Dearness Allowance)
        // Eligible only after 5 years of continuous service
        // =====================================================
        let gratuity = 0;
        if (employee.join_date) {
            const joinDate = new Date(employee.join_date);
            const serviceMs = lwdDate - joinDate;
            const yearsOfService = serviceMs / (365.25 * 24 * 60 * 60 * 1000);

            if (yearsOfService >= 5) {
                // Round to nearest integer per Act rules (0.5+ rounds up)
                const completedYears = Math.round(yearsOfService);
                const lastDrawnSalary = monthlyBasic + monthlyDA;
                gratuity = Math.round((15 * lastDrawnSalary * completedYears) / 26);
            }
        }

        // Safety checks for NaN
        const safeFloat = (val) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);

        const safePendingSalary = safeFloat(pendingSalary);
        const safeLeaveEncashment = safeFloat(leaveEncashment);
        const safeGratuity = safeFloat(gratuity);
        const safeReimbursements = safeFloat(reimbursementsPending);
        const safeLoanRecovery = safeFloat(loanRecovery);

        const grossPayable = safePendingSalary + safeLeaveEncashment + safeGratuity + safeReimbursements;
        const totalDeductions = safeLoanRecovery;
        const netPayable = grossPayable - totalDeductions;

        // Determine settlement type (PAYABLE_TO_EMPLOYEE or RECOVERABLE_FROM_EMPLOYEE)
        const settlementType = netPayable >= 0 ? 'PAYABLE_TO_EMPLOYEE' : 'RECOVERABLE_FROM_EMPLOYEE';

        // =====================================================
        // ASSET RECOVERY HOLD CHECK
        // If employee has unreturned assets, flag settlement
        // =====================================================
        let initialStatus = 'DRAFT';
        let holdReason = null;

        const pendingAssets = await db.query(
            `SELECT COUNT(*) as count, STRING_AGG(name, ', ') as assets
         FROM assets 
         WHERE tenant_id = $1 AND assigned_to = $2 AND status = 'ASSIGNED'`,
            [tenantId, employeeId]
        );

        if (parseInt(pendingAssets.rows[0]?.count || 0) > 0) {
            initialStatus = 'HOLD_ASSET_PENDING';
            holdReason = `Pending asset returns: ${pendingAssets.rows[0].assets}`;
        }

        const result = await db.query(
            `INSERT INTO fnf_settlements (
      tenant_id, employee_id, last_working_day, resignation_date,
      pending_salary, leave_encashment, gratuity, reimbursements_pending,
      gross_payable, loan_recovery, total_deductions, net_payable,
      settlement_type, hold_reason, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
            [
                tenantId, employeeId, lwdDate.toISOString().split('T')[0], resignationDate || null,
                safePendingSalary, safeLeaveEncashment, safeGratuity, safeReimbursements,
                grossPayable, safeLoanRecovery, totalDeductions, netPayable,
                settlementType, holdReason, initialStatus, userId
            ]
        );

        const fnfCreated = result.rows[0];

        // Notify employee: FnF initiated
        try {
            const empUserRes = await db.query(
                `SELECT user_id FROM employees WHERE id = $1`, [employeeId]
            );
            if (empUserRes.rows[0]) {
                await inboxService.createNotification(db, {
                    tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
                    title: 'Full & Final Settlement Initiated',
                    message: `Your Full & Final settlement has been initiated. Last working day: ${lastWorkingDay}`,
                    type: 'info', link: '/payroll/settlement'
                });
            }
        } catch (notifErr) {
            console.error('FnF create notification error:', notifErr.message);
        }

        return fnfCreated;
    } catch (err) {
        console.error('[FnF Create Error]', err);
        throw err; // Re-throw to controller
    }
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
     WHERE tenant_id = $${idx++} AND id = $${idx} AND (status = 'DRAFT' OR status = 'HOLD_ASSET_PENDING')
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
    try {

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            throw new Error('Invalid status');
        }

        const newStatus = status === 'APPROVED' ? 'APPROVED' : 'DRAFT';

        // Debug: Check existence first
        const check = await db.query(
            `SELECT id, status FROM fnf_settlements WHERE tenant_id = $1 AND id = $2`,
            [tenantId, settlementId]
        );

        if (check.rowCount === 0) {
            console.error(`[FnF Approve] Settlement ${settlementId} not found`);
            throw new Error('Settlement not found');
        }
        if (check.rows[0].status !== 'PENDING_APPROVAL') {
            console.error(`[FnF Approve] Invalid state transition from ${check.rows[0].status}`);
        }

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

        const approved = result.rows[0];

        // Notify employee: FnF approved/rejected
        try {
            const empUserRes = await db.query(
                `SELECT user_id FROM employees WHERE id = $1`, [approved.employee_id]
            );
            if (empUserRes.rows[0]) {
                const isApproved = status === 'APPROVED';
                await inboxService.createNotification(db, {
                    tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
                    title: isApproved ? 'F&F Settlement Approved ✅' : 'F&F Settlement Returned',
                    message: isApproved
                        ? `Your Full & Final settlement has been approved. Net payable: ₹${approved.net_payable}`
                        : 'Your Full & Final settlement was returned for revisions.',
                    type: isApproved ? 'success' : 'warning', link: '/payroll/settlement'
                });
            }
        } catch (notifErr) {
            console.error('FnF approve notification error:', notifErr.message);
        }

        return approved;
    } catch (err) {
        console.error('[FnF Approve Error]', err);
        throw err;
    }
};

const submitFnFForApproval = async (tenantId, settlementId) => {
    // Re-check asset status before allowing submission
    const fnf = await getFnFSettlementById(tenantId, settlementId);
    if (!fnf) throw new Error('Settlement not found');

    const pendingAssets = await db.query(
        `SELECT COUNT(*) as count, STRING_AGG(name, ', ') as assets
         FROM assets 
         WHERE tenant_id = $1 AND assigned_to = $2 AND status = 'ASSIGNED'`,
        [tenantId, fnf.employee_id]
    );

    if (parseInt(pendingAssets.rows[0]?.count || 0) > 0) {
        // Update hold reason if still pending
        await db.query(
            `UPDATE fnf_settlements SET status = 'HOLD_ASSET_PENDING', hold_reason = $1 WHERE id = $2`,
            [`Pending asset returns: ${pendingAssets.rows[0].assets}`, settlementId]
        );
        throw new Error(`Cannot submit: Assets still assigned (${pendingAssets.rows[0].assets})`);
    }

    const result = await db.query(
        `UPDATE fnf_settlements 
     SET status = 'PENDING_APPROVAL', updated_at = now()
     WHERE tenant_id = $1 AND id = $2 AND (status = 'DRAFT' OR status = 'HOLD_ASSET_PENDING')
     RETURNING *`,
        [tenantId, settlementId]
    );

    return result.rows[0];
};

const markFnFPaid = async (tenantId, settlementId, userId) => {
    try {
        const result = await db.query(
            `UPDATE fnf_settlements 
         SET status = 'PAID', paid_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND id = $2 AND status = 'APPROVED'
         RETURNING *`,
            [tenantId, settlementId]
        );

        if (result.rowCount === 0) {
            // Debug: Check why
            const check = await db.query(`SELECT status FROM fnf_settlements WHERE id=$1`, [settlementId]);
            if (check.rowCount > 0 && check.rows[0].status === 'PAID') {
                return check.rows[0];
            }
            throw new Error('Settlement not found or not approved');
        }

        const fnf = result.rows[0];
        const employeeId = fnf.employee_id;

        // 1. Mark reimbursements as PAID
        await db.query(`UPDATE reimbursement_claims SET status = 'PAID', paid_in_payrun_id = NULL, updated_at = now() WHERE tenant_id = $1 AND employee_id = $2 AND status = 'APPROVED'`, [tenantId, employeeId]);

        // 2. Mark loans as SETTLED
        await db.query(`UPDATE employee_loans SET status = 'SETTLED', updated_at = now() WHERE tenant_id = $1 AND employee_id = $2 AND status = 'ACTIVE'`, [tenantId, employeeId]);

        // 3. Mark assets as AVAILABLE
        await db.query(`UPDATE assets SET status = 'AVAILABLE', assigned_to = NULL, updated_at = now() WHERE tenant_id = $1 AND assigned_to = $2`, [tenantId, employeeId]);

        // 4. Terminate Employee
        await db.query(`UPDATE employees SET status = 'TERMINATED', exit_date = $2, updated_at = now() WHERE id = $3`, [tenantId, fnf.last_working_day, employeeId]);

        return result.rows[0];
    } catch (err) {
        console.error('[FnF Pay Error]', err);
        throw err;
    }
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
