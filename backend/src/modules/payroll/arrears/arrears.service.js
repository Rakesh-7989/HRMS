const db = require('../../../config/db');

/**
 * Arrears Management Service
 * Handles calculation and tracking of salary differences for back-dated revisions.
 */

/**
 * List all arrears for a tenant with optional filters
 * @param {string} tenantId 
 * @param {Object} filters 
 */
exports.listArrears = async (tenantId, filters = {}) => {
    let query = `
        SELECT sa.*, e.first_name, e.last_name, e.employee_id as emp_code
        FROM salary_arrears sa
        JOIN employees e ON e.id = sa.employee_id
        WHERE sa.tenant_id = $1
    `;
    const params = [tenantId];

    if (filters.status) {
        params.push(filters.status);
        query += ` AND sa.status = $${params.length}`;
    }

    if (filters.employeeId) {
        params.push(filters.employeeId);
        query += ` AND sa.employee_id = $${params.length}`;
    }

    query += ` ORDER BY sa.year DESC, sa.month DESC, sa.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

/**
 * Fetch all pending arrears for an employee
 * @param {string} tenantId 
 * @param {string} employeeId 
 * @returns {Array} List of pending arrears
 */
exports.getPendingArrears = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT * FROM salary_arrears 
         WHERE tenant_id = $1 AND employee_id = $2 AND status = 'PENDING'
         ORDER BY year ASC, month ASC`,
        [tenantId, employeeId]
    );
    return result.rows;
};

/**
 * Link pending arrears to a payroll run
 * This marks the intent to pay these arrears in this specific run.
 */
exports.linkArrearsToPayrun = async (tenantId, payrollRunId, employeeId, client = db) => {
    await client.query(
        `UPDATE salary_arrears 
         SET payroll_run_id = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND employee_id = $3 AND status = 'PENDING' AND payroll_run_id IS NULL`,
        [payrollRunId, tenantId, employeeId]
    );
};
exports.markArrearsAsPaid = exports.linkArrearsToPayrun;

/**
 * Finalize arrears for a payroll run (mark as PAID)
 */
exports.finalizeArrearsForPayrun = async (tenantId, payrollRunId, client = db) => {
    await client.query(
        `UPDATE salary_arrears 
         SET status = 'PAID', updated_at = NOW()
         WHERE tenant_id = $1 AND payroll_run_id = $2 AND status = 'PENDING'`,
        [tenantId, payrollRunId]
    );
};

/**
 * Unlink arrears from a payroll run (revert to PENDING)
 */
exports.unlinkArrearsFromPayrun = async (tenantId, payrollRunId, client = db) => {
    await client.query(
        `UPDATE salary_arrears 
         SET payroll_run_id = NULL, updated_at = NOW()
         WHERE tenant_id = $1 AND payroll_run_id = $2 AND status = 'PENDING'`,
        [tenantId, payrollRunId]
    );
};

/**
 * Mark arrears as paid by linking them to a payroll run (Legacy, consolidated above)
 * @param {string} tenantId 
 * @param {string} payrollRunId 
 * @param {string} employeeId 
 * @param {Object} client - DB client for transaction
 */

/**
 * Calculate arrears for a new salary assignment
 * This should be called whenever a back-dated salary revision is saved.
 * 
 * Logic:
 * 1. Identify months between effective_from and today that have already been processed in payroll.
 * 2. Calculate the difference: New Monthly Net - Paid Monthly Net.
 * 3. Save as PENDING records in salary_arrears table.
 */
exports.calculateRetroactiveArrears = async (tenantId, employeeId, newAssignment, _userId) => {
    const effectiveFrom = new Date(newAssignment.effective_from);

    // Find already processed payrolls for this employee starting from effectiveFrom
    const processedPayruns = await db.query(
        `SELECT pr.id as payrun_id, pr.period_month, pr.period_year, pri.net_salary as paid_net
         FROM payroll_runs pr
         JOIN payroll_run_items pri ON pri.payroll_run_id = pr.id
         WHERE pr.tenant_id = $1 
           AND pri.employee_id = $2 
           AND pr.status IN ('APPROVED', 'RELEASED')
           AND (pr.period_year > $3 OR (pr.period_year = $3 AND pr.period_month >= $4))
         ORDER BY pr.period_year DESC, pr.period_month DESC`,
        [tenantId, employeeId, effectiveFrom.getFullYear(), effectiveFrom.getMonth() + 1]
    );

    if (processedPayruns.rowCount === 0) return;

    // Calculate the new monthly breakdown (this service might need to call salaryStructureService)
    // For now we assume newAssignment already contains the breakdown OR we can fetch it
    const newMonthlyNet = parseFloat(newAssignment.summary?.monthly_net || 0);

    for (const run of processedPayruns.rows) {
        const diff = newMonthlyNet - parseFloat(run.paid_net);

        if (diff > 0) {
            await db.query(
                `INSERT INTO salary_arrears 
                 (tenant_id, employee_id, assignment_id, month, year, amount, remarks, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
                 ON CONFLICT DO NOTHING`,
                [
                    tenantId, employeeId, newAssignment.id,
                    run.period_month, run.period_year, diff,
                    `Arrears for ${run.period_month}/${run.period_year} due to revision from ${newAssignment.effective_from}`,
                ]
            );
        }
    }
};
