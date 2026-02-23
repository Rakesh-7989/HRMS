const db = require("../../../config/db");
const payslipService = require("../payslip/payslip.service");
const payrunService = require("../payrun/payrun.service");

// ===================================================================
// AUDIT LOG HELPER
// ===================================================================
const logAuditEntry = async (runId, userId, action, details = {}) => {
    try {
        await db.query(
            `INSERT INTO payroll_audit_log (payroll_run_id, performed_by, action, details)
             VALUES ($1, $2, $3, $4)`,
            [runId, userId, action, JSON.stringify(details)]
        );
    } catch (err) {
        console.error("Audit log error:", err.message);
    }
};

// ===================================================================
// HELPER: Stage Derivation
// ===================================================================
const getStageFromStatus = (status) => {
    if (status === 'CALCULATING') return 'INITIATE';
    if (['PENDING_APPROVAL', 'REJECTED', 'CALCULATED'].includes(status)) return 'VERIFY';
    if (['APPROVED', 'RELEASED'].includes(status)) return 'RELEASE';
    return 'REVIEW';
};

// ===================================================================
// RiVeR DASHBOARD ANALYTICS (Enhanced)
// ===================================================================

const getDashboardStats = async (tenantId, month, year) => {
    // 1. Current Run Status
    const runs = await db.query(
        `SELECT id, stage, status, verification_status, created_at, released_at,
                total_gross, total_net, total_employees
         FROM payroll_runs 
         WHERE tenant_id = $1 AND period_month = $2 AND period_year = $3`,
        [tenantId, month, year]
    );
    const activeRun = runs.rows[0];

    // 2. Headcount Overview
    const totalEmpRes = await db.query(
        `SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND status = 'ACTIVE' AND is_deleted = FALSE`,
        [tenantId]
    );
    const totalEmployees = parseInt(totalEmpRes.rows[0].count);

    const includedEmpRes = await db.query(
        `SELECT COUNT(DISTINCT employee_id) 
         FROM employee_salary_assignments 
         WHERE tenant_id = $1 AND is_current = TRUE`,
        [tenantId]
    );
    const includedEmployees = parseInt(includedEmpRes.rows[0].count);
    const excludedEmployees = totalEmployees - includedEmployees;

    const incompletInfoRes = await db.query(
        `SELECT COUNT(*) FROM employees e
         LEFT JOIN employee_salary_assignments esa ON e.id = esa.employee_id AND esa.is_current = TRUE
         WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND esa.id IS NULL`,
        [tenantId]
    );
    const incompleteInfo = parseInt(incompletInfoRes.rows[0].count);

    const onHoldEmpRes = await db.query(
        `SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND status = 'ON_HOLD' AND is_deleted = FALSE`,
        [tenantId]
    );

    // 3. Payroll Cost Summary (from last released run)
    const costRes = await db.query(
        `SELECT COALESCE(SUM(pri.gross_salary), 0) as total_gross,
                COALESCE(SUM(pri.net_salary), 0) as total_net,
                COALESCE(SUM(pri.total_deductions), 0) as total_deductions,
                COALESCE(SUM(pri.tds), 0) as total_tds,
                COUNT(pri.id) as processed_count
         FROM payroll_run_items pri
         JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
         WHERE pr.tenant_id = $1 AND pr.period_month = $2 AND pr.period_year = $3`,
        [tenantId, month, year]
    );
    const costSummary = costRes.rows[0];

    // 4. 6-Month Payroll Trend
    const trendRes = await db.query(
        `SELECT pr.period_month, pr.period_year, pr.status,
                COALESCE(SUM(pri.gross_salary), 0) as total_gross,
                COALESCE(SUM(pri.net_salary), 0) as total_net,
                COUNT(DISTINCT pri.employee_id) as employee_count
         FROM payroll_runs pr
         LEFT JOIN payroll_run_items pri ON pri.payroll_run_id = pr.id
         WHERE pr.tenant_id = $1
         GROUP BY pr.id, pr.period_month, pr.period_year, pr.status
         ORDER BY pr.period_year DESC, pr.period_month DESC
         LIMIT 6`,
        [tenantId]
    );
    const monthlyTrend = trendRes.rows.reverse();

    // 5. Department-wise Cost Breakdown
    const deptCostRes = await db.query(
        `SELECT d.name as department, 
                COALESCE(SUM(pri.gross_salary), 0) as total_cost,
                COUNT(DISTINCT pri.employee_id) as emp_count
         FROM payroll_run_items pri
         JOIN employees e ON e.id = pri.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
         WHERE pr.tenant_id = $1 AND pr.period_month = $2 AND pr.period_year = $3
         GROUP BY d.name
         ORDER BY total_cost DESC`,
        [tenantId, month, year]
    );

    // 6. Statutory Summary
    let statutoryRes = { rows: [] };
    try {
        statutoryRes = await db.query(
            `SELECT COALESCE(SUM(pric.amount), 0) as total_amount, pric.name as component_name
             FROM payroll_run_item_components pric
             JOIN payroll_run_items pri ON pri.id = pric.payroll_run_item_id
             JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
             WHERE pr.tenant_id = $1 AND pr.period_month = $2 AND pr.period_year = $3
               AND pric.component_type = 'DEDUCTION'
             GROUP BY pric.name`,
            [tenantId, month, year]
        );
    } catch (e) { /* table may not have data */ }

    // 7. Quick Alerts
    let pendingLeavesRes = { rows: [{ count: 0 }] };
    let missingStructRes2 = { rows: [{ count: 0 }] };
    try {
        pendingLeavesRes = await db.query(
            `SELECT COUNT(*) FROM leave_applications WHERE tenant_id = $1 AND status = 'PENDING'`,
            [tenantId]
        );
    } catch (e) { }
    try {
        missingStructRes2 = await db.query(
            `SELECT COUNT(*) FROM employees e
             LEFT JOIN employee_salary_assignments esa ON e.id = esa.employee_id AND esa.is_current = TRUE
             WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND esa.id IS NULL`,
            [tenantId]
        );
    } catch (e) { }

    // 8. Recent Payroll History
    const historyRes = await db.query(
        `SELECT pr.id, pr.period_month, pr.period_year, pr.stage, pr.status, 
                pr.verification_status, pr.created_at, pr.released_at,
                COALESCE(pr.total_gross, 0) as total_gross,
                COALESCE(pr.total_net, 0) as total_net,
                COALESCE(pr.total_employees, 0) as total_employees
         FROM payroll_runs pr
         WHERE pr.tenant_id = $1
         ORDER BY pr.period_year DESC, pr.period_month DESC
         LIMIT 6`,
        [tenantId]
    );

    const onHoldEmployees = parseInt(onHoldEmpRes.rows[0].count);

    // 9. Arrears Summary
    const arrearsRes = await db.query(
        `SELECT 
            COUNT(*) filter (where status = 'PENDING') as pending_count,
            COALESCE(SUM(amount) filter (where status = 'PENDING'), 0) as pending_amount
         FROM salary_arrears
         WHERE tenant_id = $1`,
        [tenantId]
    );
    const arrearsSummary = arrearsRes.rows[0];

    return {
        runStatus: activeRun ? {
            id: activeRun.id,
            stage: activeRun.stage,
            status: activeRun.status,
            verificationStatus: activeRun.verification_status,
            lastUpdated: activeRun.created_at,
            releasedAt: activeRun.released_at
        } : null,
        headcount: {
            total: totalEmployees,
            included: includedEmployees,
            excluded: excludedEmployees,
            incomplete: incompleteInfo,
            onHold: onHoldEmployees
        },
        costSummary: {
            totalGross: parseFloat(costSummary.total_gross),
            totalNet: parseFloat(costSummary.total_net),
            totalDeductions: parseFloat(costSummary.total_deductions),
            totalTds: parseFloat(costSummary.total_tds),
            processedCount: parseInt(costSummary.processed_count)
        },
        monthlyTrend: monthlyTrend.map(t => ({
            month: t.period_month,
            year: t.period_year,
            status: t.status,
            totalGross: parseFloat(t.total_gross),
            totalNet: parseFloat(t.total_net),
            employeeCount: parseInt(t.employee_count)
        })),
        departmentCosts: deptCostRes.rows.map(d => ({
            department: d.department || 'Unassigned',
            totalCost: parseFloat(d.total_cost),
            employeeCount: parseInt(d.emp_count)
        })),
        statutorySummary: statutoryRes.rows.map(s => ({
            component: s.component_name,
            total: parseFloat(s.total_amount)
        })),
        alerts: {
            pendingLeaves: parseInt(pendingLeavesRes.rows[0]?.count || 0),
            missingStructures: parseInt(missingStructRes2.rows[0]?.count || 0)
        },
        recentHistory: historyRes.rows.map(h => ({
            id: h.id,
            month: h.period_month,
            year: h.period_year,
            stage: h.stage,
            status: h.status,
            verificationStatus: h.verification_status,
            totalGross: parseFloat(h.total_gross),
            totalNet: parseFloat(h.total_net),
            totalEmployees: parseInt(h.total_employees),
            createdAt: h.created_at,
            releasedAt: h.released_at
        })),
        arrearsSummary: {
            pendingCount: parseInt(arrearsSummary.pending_count),
            pendingAmount: parseFloat(arrearsSummary.pending_amount)
        }
    };
};

const createRun = async (tenantId, month, year, userId) => {
    const existing = await db.query(
        `SELECT id, stage, status FROM payroll_runs WHERE tenant_id = $1 AND period_month = $2 AND period_year = $3`,
        [tenantId, month, year]
    );

    // Return existing run instead of throwing error
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    // Calculate period_start and period_end from month/year
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month

    const res = await db.query(
        `INSERT INTO payroll_runs (tenant_id, period_month, period_year, period_start, period_end, stage, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'REVIEW', 'PENDING', $6)
         RETURNING id, stage, status`,
        [tenantId, month, year, periodStart, periodEnd, userId]
    );

    await logAuditEntry(res.rows[0].id, userId, 'RUN_CREATED', { month, year });
    return res.rows[0];
};

// ===================================================================
// STAGE 1: REVIEW (Enhanced Data Aggregation)
// ===================================================================

const getReviewData = async (tenantId, runId) => {
    const runRes = await db.query(`SELECT * FROM payroll_runs WHERE id = $1`, [runId]);
    const run = runRes.rows[0];
    const { period_start, period_end } = run;

    // 1. HEADCOUNT ANALYTICS — Detailed
    const joinersRes = await db.query(
        `SELECT e.id, e.first_name, e.last_name, e.employee_id as emp_code, 
                d.name as department, e.join_date
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.tenant_id = $1 AND e.join_date BETWEEN $2 AND $3`,
        [tenantId, period_start, period_end]
    );
    const newJoiners = joinersRes.rows;

    const exitsRes = await db.query(
        `SELECT e.id, e.first_name, e.last_name, e.employee_id as emp_code,
                d.name as department, e.status
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.tenant_id = $1 AND e.status IN ('RESIGNED', 'TERMINATED', 'INACTIVE')
           AND e.updated_at BETWEEN $2 AND $3`,
        [tenantId, period_start, period_end]
    );
    const exitEmployees = exitsRes.rows;

    // 2. ATTENDANCE & LOP — Employee-Level Details
    const lopRes = await db.query(
        `SELECT DISTINCT la.employee_id, e.first_name, e.last_name, e.employee_id as emp_code,
                d.name as department,
                SUM(la.days_count) as lop_days
         FROM leave_applications la
         JOIN leave_types lt ON lt.id = la.leave_type_id
         JOIN employees e ON e.id = la.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE la.tenant_id = $1 AND la.status = 'APPROVED' AND lt.is_paid = FALSE
           AND la.start_date <= $3 AND la.end_date >= $2
         GROUP BY la.employee_id, e.first_name, e.last_name, e.employee_id, d.name`,
        [tenantId, period_start, period_end]
    );
    const lopEmployees = lopRes.rows;

    // 3. SALARY REVISIONS — Detailed
    const revisionsRes = await db.query(
        `SELECT esa.employee_id, e.first_name, e.last_name, e.employee_id as emp_code,
                d.name as department, esa.annual_ctc, esa.effective_from,
                st.name as structure_name
         FROM employee_salary_assignments esa
         JOIN employees e ON e.id = esa.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN salary_structures st ON st.id = esa.structure_id
         WHERE esa.tenant_id = $1 AND esa.effective_from BETWEEN $2 AND $3`,
        [tenantId, period_start, period_end]
    );
    const salaryRevisions = revisionsRes.rows;

    // 4. TDS Employees Count
    let totalTdsEmployees = 0;
    try {
        const tdsRes = await db.query(
            `SELECT COUNT(DISTINCT employee_id) FROM tax_declarations WHERE tenant_id = $1`,
            [tenantId]
        );
        totalTdsEmployees = parseInt(tdsRes.rows[0].count);
    } catch (e) { /* ignore */ }

    // 5. ARREARS Management Details
    const arrearsDetailsRes = await db.query(
        `SELECT sa.*, e.first_name, e.last_name, e.employee_id as emp_code, d.name as department
         FROM salary_arrears sa
         JOIN employees e ON e.id = sa.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE sa.tenant_id = $1 AND sa.status = 'PENDING'`,
        [tenantId]
    );
    const arrearsDetails = arrearsDetailsRes.rows;

    // 6. CHECKLIST (Enhanced)
    const pendingLeavesRes = await db.query(
        `SELECT COUNT(*) FROM leave_applications WHERE tenant_id = $1 AND status = 'PENDING'`,
        [tenantId]
    );
    const pendingLeaves = parseInt(pendingLeavesRes.rows[0].count);

    const missingStructRes = await db.query(
        `SELECT COUNT(*) FROM employees e
         LEFT JOIN employee_salary_assignments esa ON e.id = esa.employee_id AND esa.is_current = TRUE
         WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND esa.id IS NULL`,
        [tenantId]
    );
    const missingStruct = parseInt(missingStructRes.rows[0].count);

    let statutoryConfigured = false;
    try {
        const statRes = await db.query(`SELECT pf_enabled FROM statutory_config WHERE tenant_id = $1`, [tenantId]);
        statutoryConfigured = statRes.rows.length > 0;
    } catch (e) { }

    const systemChecks = [
        { name: 'Approve Pending Leaves', status: pendingLeaves > 0 ? 'WARNING' : 'COMPLETED', comment: `${pendingLeaves} pending requests`, category: 'ATTENDANCE' },
        { name: 'Assign Salary Structures', status: missingStruct > 0 ? 'WARNING' : 'COMPLETED', comment: `${missingStruct} employees missing structure`, category: 'SALARY' },
        { name: 'Verify Attendance Logs', status: 'PENDING', comment: 'Manual verification required', category: 'ATTENDANCE' },
        { name: 'Review New Joiners', status: newJoiners.length > 0 ? 'INFO' : 'COMPLETED', comment: `${newJoiners.length} new joiners this month`, category: 'HEADCOUNT' },
        { name: 'Check LOP Deductions', status: lopEmployees.length > 0 ? 'INFO' : 'COMPLETED', comment: `${lopEmployees.length} employees have LOP`, category: 'ATTENDANCE' },
        { name: 'Review Exit Employees', status: exitEmployees.length > 0 ? 'WARNING' : 'COMPLETED', comment: `${exitEmployees.length} employees exiting`, category: 'HEADCOUNT' },
        { name: 'Verify Statutory Configuration', status: statutoryConfigured ? 'COMPLETED' : 'WARNING', comment: statutoryConfigured ? 'PF/ESI/PT configured' : 'Statutory not configured', category: 'COMPLIANCE' },
        { name: 'Review Salary Revisions', status: salaryRevisions.length > 0 ? 'INFO' : 'COMPLETED', comment: `${salaryRevisions.length} revisions effective this month`, category: 'SALARY' }
    ];

    const existingChecks = await db.query(`SELECT * FROM payroll_checklist WHERE payroll_run_id = $1`, [runId]);
    if (existingChecks.rows.length === 0) {
        for (const check of systemChecks) {
            await db.query(`INSERT INTO payroll_checklist (payroll_run_id, item_name, status, comment) VALUES ($1, $2, $3, $4)`, [runId, check.name, check.status, check.comment]);
        }
    } else {
        for (const check of systemChecks) {
            await db.query(`UPDATE payroll_checklist SET status = $1, comment = $2 WHERE payroll_run_id = $3 AND item_name = $4`, [check.status, check.comment, runId, check.name]);
        }
    }

    const checklistRes = await db.query(`SELECT * FROM payroll_checklist WHERE payroll_run_id = $1 ORDER BY id ASC`, [runId]);

    // 7. VARIANCE 
    const prevRunRes = await db.query(
        `SELECT * FROM payroll_runs 
         WHERE tenant_id = $1 AND id != $2 AND status IN ('RELEASED', 'APPROVED', 'CALCULATED')
         ORDER BY period_year DESC, period_month DESC LIMIT 1`,
        [tenantId, runId]
    );
    const prevRun = prevRunRes.rows[0] || { total_gross: 0, total_employees: 0, total_net: 0 };
    const curGross = parseFloat(run.total_gross || 0);
    const prevGross = parseFloat(prevRun.total_gross || 0);
    const curNet = parseFloat(run.total_net || 0);
    const prevNet = parseFloat(prevRun.total_net || 0);
    const curHeadcount = parseInt(run.total_employees || 0);
    const prevHeadcount = parseInt(prevRun.total_employees || 0);

    const variance = {
        gross: { current: curGross, previous: prevGross, diff: curGross - prevGross, percent: prevGross === 0 ? 0 : (((curGross - prevGross) / prevGross) * 100).toFixed(2) },
        net: { current: curNet, previous: prevNet, diff: curNet - prevNet, percent: prevNet === 0 ? 0 : (((curNet - prevNet) / prevNet) * 100).toFixed(2) },
        headcount: { current: curHeadcount, previous: prevHeadcount, diff: curHeadcount - prevHeadcount }
    };

    return {
        runStatus: { id: run.id, stage: getStageFromStatus(run.status), status: run.status, verification_status: run.verification_status, periodMonth: run.period_month, periodYear: run.period_year },
        checklist: checklistRes.rows,
        variance,
        categories: {
            headcount: { newJoiners: newJoiners.length, exits: exitEmployees.length, newJoinerDetails: newJoiners, exitDetails: exitEmployees },
            attendance: { employeesWithLop: lopEmployees.length, lopDetails: lopEmployees },
            finance: { salaryRevisions: salaryRevisions.length, totalTdsEmployees, revisionDetails: salaryRevisions },
            arrears: { count: arrearsDetails.length, totalAmount: arrearsDetails.reduce((sum, a) => sum + parseFloat(a.amount), 0), details: arrearsDetails }
        }
    };
};

const updateChecklist = async (tenantId, runId, items) => {
    for (const item of items) {
        if (item.id) {
            await db.query(
                `UPDATE payroll_checklist SET status = $1, comment = $2, updated_at = NOW() WHERE id = $3`,
                [item.status, item.comment, item.id]
            );
        }
    }
    return getReviewData(tenantId, runId);
};

// ===================================================================
// STAGE 2: INITIATE (Enhanced Calculation & Freezing)
// ===================================================================

const initiatePayroll = async (tenantId, runId, userId) => {
    // 1. Trigger Payrun Calculation
    // Note: calculatePayrun already manages its own internal transaction/locks as needed
    await payrunService.calculatePayrun(tenantId, runId, userId);

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 2. Freeze Results with component-level breakdown
        // Use client for transactional read to ensure consistency if concurrent writes happen (though less likely here)
        // However, payrunService.getPayrunItems uses db.query internally. 
        // ideally we should pass client to it, but for now we'll fetch items first.
        // Since we are in a transaction block for the INSERTS, it's safer.
        const items = await payrunService.getPayrunItems(tenantId, runId);

        if (!items || items.length === 0) {
            throw new Error("No eligible employees found for payroll calculation. Please check attendance and salary structures.");
        }

        // Clear existing results using transaction client
        await client.query(`DELETE FROM payroll_results WHERE payroll_run_id = $1`, [runId]);

        for (const item of items) {
            // Get component breakdown
            let basicPay = 0, hra = 0, otherAllow = 0;
            let pfEmp = 0, pfEr = 0, esiEmp = 0, esiEr = 0, pt = 0, tds = 0;

            try {
                // Use default pool for reads or client? Client is better for consistency if we modified valid components earlier in transaction
                // specific components are usually static here.
                const compRes = await client.query(
                    `SELECT name, component_type, amount FROM payroll_run_item_components WHERE payroll_run_item_id = $1`,
                    [item.id]
                );
                for (const comp of compRes.rows) {
                    const compName = (comp.name || '').toUpperCase();
                    const amt = parseFloat(comp.amount || 0);
                    if (compName === 'BASIC') basicPay += amt;
                    else if (compName.includes('HRA')) hra += amt;
                    else if ((compName.includes('PF') || compName.includes('PROVIDENT')) && !compName.includes('EMPLOYER')) pfEmp += amt;
                    else if ((compName.includes('PF') || compName.includes('PROVIDENT')) && compName.includes('EMPLOYER')) pfEr += amt;
                    else if ((compName.includes('ESI') || compName.includes('INSURANCE')) && !compName.includes('EMPLOYER')) esiEmp += amt;
                    else if ((compName.includes('ESI') || compName.includes('INSURANCE')) && compName.includes('EMPLOYER')) esiEr += amt;
                    else if (compName.includes('PT') || compName.includes('PROFESSIONAL')) pt += amt;
                    else if (compName.includes('TDS') || compName.includes('INCOME TAX') || compName.includes('TAX')) tds += amt;
                    else if (comp.component_type === 'EARNING') otherAllow += amt;
                }
            } catch (e) { /* components table may not exist yet */ }

            await client.query(
                `INSERT INTO payroll_results(
            payroll_run_id, employee_id, gross_pay, deductions, net_pay, tax, status,
            basic_pay, hra, other_allowances, pf_employee, pf_employer,
            esi_employee, esi_employer, professional_tax, tds_amount,
            lop_days, lop_deduction, department_id, designation_id
        ) VALUES($1, $2, $3, $4, $5, $6, 'PROCESSED', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                [
                    runId, item.employee_id,
                    item.gross_salary, item.total_deductions, item.net_salary, item.tds || 0,
                    basicPay, hra, otherAllow, pfEmp, pfEr, esiEmp, esiEr, pt, tds,
                    item.lop_days || 0, item.lop_deduction || 0,
                    item.department_id || null, item.designation_id || null
                ]
            );
        }

        // 3. Update Stage
        await client.query(
            `UPDATE payroll_runs SET stage = 'VERIFY', status = 'CALCULATED', processed_by = $1, processed_at = NOW() WHERE id = $2`,
            [userId, runId]
        );

        await client.query('COMMIT');

        // Audit log (outside transaction for performance/safety, strict consistency not required for logs)
        await logAuditEntry(runId, userId, 'PAYROLL_INITIATED', { itemCount: items.length });

        return { message: "Payroll Initiated and Frozen", itemCount: items.length };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ===================================================================
// STAGE 3: VERIFY (Enhanced E-Approvals & Analytics)
// ===================================================================

const getVerificationData = async (tenantId, runId) => {
    // Approvals
    const approvalsRes = await db.query(
        `SELECT pa.*, e.first_name, e.last_name, u.email 
         FROM payroll_approvals pa
         JOIN users u ON u.id = pa.approver_id
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE pa.payroll_run_id = $1
         ORDER BY pa.approved_at DESC`,
        [runId]
    );

    // Overall Summary
    const summaryRes = await db.query(
        `SELECT COUNT(*) as count,
        COALESCE(SUM(gross_pay), 0) as total_gross,
        COALESCE(SUM(net_pay), 0) as total_net,
        COALESCE(SUM(deductions), 0) as total_deductions,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(basic_pay), 0) as total_basic,
        COALESCE(SUM(hra), 0) as total_hra,
        COALESCE(SUM(other_allowances), 0) as total_other_allowances,
        COALESCE(SUM(pf_employee), 0) as total_pf_employee,
        COALESCE(SUM(pf_employer), 0) as total_pf_employer,
        COALESCE(SUM(esi_employee), 0) as total_esi_employee,
        COALESCE(SUM(esi_employer), 0) as total_esi_employer,
        COALESCE(SUM(professional_tax), 0) as total_pt,
        COALESCE(SUM(tds_amount), 0) as total_tds
         FROM payroll_results WHERE payroll_run_id = $1`,
        [runId]
    );

    // Department-wise Breakdown
    const deptBreakdownRes = await db.query(
        `SELECT d.name as department,
        COUNT(*) as emp_count,
        COALESCE(SUM(pr.gross_pay), 0) as dept_gross,
        COALESCE(SUM(pr.deductions), 0) as dept_deductions,
        COALESCE(SUM(pr.net_pay), 0) as dept_net
         FROM payroll_results pr
         LEFT JOIN departments d ON d.id = pr.department_id
         WHERE pr.payroll_run_id = $1
         GROUP BY d.name
         ORDER BY dept_gross DESC`,
        [runId]
    );

    // Employee-level Details
    const employeeDetailsRes = await db.query(
        `SELECT pr.*, e.first_name, e.last_name, e.employee_id as emp_code,
        d.name as department, des.name as designation
         FROM payroll_results pr
         JOIN employees e ON e.id = pr.employee_id
         LEFT JOIN departments d ON d.id = pr.department_id
         LEFT JOIN designations des ON des.id = pr.designation_id
         WHERE pr.payroll_run_id = $1
         ORDER BY e.first_name ASC`,
        [runId]
    );

    // Variance Alerts (employees with >10% change from previous)
    const varianceAlerts = [];
    try {
        const run = await db.query(`SELECT period_month, period_year FROM payroll_runs WHERE id = $1`, [runId]);
        const curRun = run.rows[0];
        // Find previous released run
        const prevRunRes = await db.query(
            `SELECT id FROM payroll_runs WHERE tenant_id = $1 AND id != $2 AND status IN('RELEASED', 'CALCULATED')
             ORDER BY period_year DESC, period_month DESC LIMIT 1`,
            [tenantId, runId]
        );
        if (prevRunRes.rows.length > 0) {
            const prevRunId = prevRunRes.rows[0].id;
            const varRes = await db.query(
                `SELECT cr.employee_id, e.first_name, e.last_name, e.employee_id as emp_code,
        cr.gross_pay as current_gross, pr.gross_pay as previous_gross,
        CASE WHEN pr.gross_pay > 0 THEN ROUND(((cr.gross_pay - pr.gross_pay) / pr.gross_pay * 100):: numeric, 2) ELSE 0 END as change_percent
                 FROM payroll_results cr
                 JOIN payroll_results pr ON pr.employee_id = cr.employee_id AND pr.payroll_run_id = $2
                 JOIN employees e ON e.id = cr.employee_id
                 WHERE cr.payroll_run_id = $1
                   AND pr.gross_pay > 0
                   AND ABS(cr.gross_pay - pr.gross_pay) / pr.gross_pay > 0.10
                 ORDER BY change_percent DESC`,
                [runId, prevRunId]
            );
            varianceAlerts.push(...varRes.rows);
        }
    } catch (e) { /* variance is optional */ }

    // Run status
    const runStatusRes = await db.query(
        `SELECT stage, status, verification_status FROM payroll_runs WHERE id = $1`, [runId]
    );

    const summary = summaryRes.rows[0];
    const runStatus = runStatusRes.rows[0];
    return {
        runStatus: {
            ...runStatus,
            stage: getStageFromStatus(runStatus?.status)
        },
        approvals: approvalsRes.rows,
        summary: {
            count: parseInt(summary.count),
            total_gross: parseFloat(summary.total_gross),
            total_net: parseFloat(summary.total_net),
            total_deductions: parseFloat(summary.total_deductions),
            total_tax: parseFloat(summary.total_tax)
        },
        componentBreakdown: {
            basic: parseFloat(summary.total_basic),
            hra: parseFloat(summary.total_hra),
            otherAllowances: parseFloat(summary.total_other_allowances),
            pfEmployee: parseFloat(summary.total_pf_employee),
            pfEmployer: parseFloat(summary.total_pf_employer),
            esiEmployee: parseFloat(summary.total_esi_employee),
            esiEmployer: parseFloat(summary.total_esi_employer),
            professionalTax: parseFloat(summary.total_pt),
            tds: parseFloat(summary.total_tds)
        },
        departmentBreakdown: deptBreakdownRes.rows.map(d => ({
            department: d.department || 'Unassigned',
            employeeCount: parseInt(d.emp_count),
            gross: parseFloat(d.dept_gross),
            deductions: parseFloat(d.dept_deductions),
            net: parseFloat(d.dept_net)
        })),
        employees: employeeDetailsRes.rows.map(emp => ({
            employeeId: emp.employee_id,
            name: `${emp.first_name} ${emp.last_name}`,
            empCode: emp.emp_code,
            department: emp.department,
            designation: emp.designation,
            grossPay: parseFloat(emp.gross_pay),
            deductions: parseFloat(emp.deductions),
            netPay: parseFloat(emp.net_pay),
            basicPay: parseFloat(emp.basic_pay || 0),
            hra: parseFloat(emp.hra || 0),
            pfEmployee: parseFloat(emp.pf_employee || 0),
            esiEmployee: parseFloat(emp.esi_employee || 0),
            pt: parseFloat(emp.professional_tax || 0),
            tds: parseFloat(emp.tds_amount || 0),
            lopDays: parseFloat(emp.lop_days || 0)
        })),
        varianceAlerts: varianceAlerts.map(v => ({
            employeeId: v.employee_id,
            name: `${v.first_name} ${v.last_name}`,
            empCode: v.emp_code,
            currentGross: parseFloat(v.current_gross),
            previousGross: parseFloat(v.previous_gross),
            changePercent: parseFloat(v.change_percent)
        }))
    };
};

const submitApproval = async (tenantId, runId, userId, status, comments) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO payroll_approvals(payroll_run_id, approver_id, status, comments, approved_at)
         VALUES($1, $2, $3, $4, NOW())`,
            [runId, userId, status, comments]
        );

        if (status === 'APPROVED') {
            await client.query(
                `UPDATE payroll_runs SET verification_status = 'APPROVED' WHERE id = $1`, [runId]
            );
        } else if (status === 'REJECTED') {
            await client.query(
                `UPDATE payroll_runs SET verification_status = 'REJECTED' WHERE id = $1`, [runId]
            );
        }

        await client.query('COMMIT');

        // Audit log (outside transaction)
        await logAuditEntry(runId, userId, `PAYROLL_${status}`, { comments });

        return getVerificationData(tenantId, runId);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ===================================================================
// STAGE 4: RELEASE (Enhanced Publishing & Reports)
// ===================================================================

const getReleaseSummary = async (tenantId, runId) => {
    const summaryRes = await db.query(
        `SELECT COUNT(*) as emp_count,
        COALESCE(SUM(gross_pay), 0) as total_gross,
        COALESCE(SUM(net_pay), 0) as total_net,
        COALESCE(SUM(deductions), 0) as total_deductions,
        COALESCE(SUM(tax), 0) as total_tax
         FROM payroll_results WHERE payroll_run_id = $1`,
        [runId]
    );

    // Department breakdown
    const deptRes = await db.query(
        `SELECT d.name as department, COUNT(*) as count, COALESCE(SUM(pr.net_pay), 0) as net
         FROM payroll_results pr
         LEFT JOIN departments d ON d.id = pr.department_id
         WHERE pr.payroll_run_id = $1
         GROUP BY d.name ORDER BY net DESC`,
        [runId]
    );

    // Audit trail
    const auditRes = await db.query(
        `SELECT pal.*, e.first_name, e.last_name, u.email
         FROM payroll_audit_log pal
         JOIN users u ON u.id = pal.performed_by
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE pal.payroll_run_id = $1
         ORDER BY pal.created_at ASC`,
        [runId]
    );

    // Run info
    const runRes = await db.query(
        `SELECT * FROM payroll_runs WHERE id = $1`, [runId]
    );
    const run = runRes.rows[0];

    const summary = summaryRes.rows[0];
    return {
        run: {
            id: run.id,
            month: run.period_month,
            year: run.period_year,
            stage: getStageFromStatus(run.status),
            status: run.status,
            verificationStatus: run.verification_status
        },
        totals: {
            employeeCount: parseInt(summary.emp_count),
            totalGross: parseFloat(summary.total_gross),
            totalNet: parseFloat(summary.total_net),
            totalDeductions: parseFloat(summary.total_deductions),
            totalTax: parseFloat(summary.total_tax)
        },
        departmentBreakdown: deptRes.rows.map(d => ({
            department: d.department || 'Unassigned',
            count: parseInt(d.count),
            netPay: parseFloat(d.net)
        })),
        auditTrail: auditRes.rows.map(a => ({
            action: a.action,
            performedBy: a.first_name ? `${a.first_name} ${a.last_name}` : 'System',
            details: a.details,
            timestamp: a.created_at
        }))
    };
};

const getBankFileData = async (tenantId, runId) => {
    const result = await db.query(
        `SELECT 
            pr.employee_id, e.first_name, e.last_name, e.employee_id as emp_code,
        pr.net_pay,
        e.bank_name, e.account_number, e.ifsc_code,
        d.name as department
         FROM payroll_results pr
         JOIN employees e ON e.id = pr.employee_id
         LEFT JOIN departments d ON d.id = pr.department_id
         WHERE pr.payroll_run_id = $1 AND pr.net_pay > 0
         ORDER BY e.first_name ASC`,
        [runId]
    );

    const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.net_pay), 0);

    return {
        bankEntries: result.rows.map((r, idx) => ({
            sno: idx + 1,
            employeeName: `${r.first_name} ${r.last_name}`,
            empCode: r.emp_code,
            bankName: r.bank_name || '',
            accountNumber: r.account_number || '',
            ifscCode: r.ifsc_code || '',
            amount: parseFloat(r.net_pay),
            department: r.department
        })),
        totalAmount,
        employeeCount: result.rows.length,
        generatedAt: new Date().toISOString()
    };
};

const getSalaryRegister = async (tenantId, runId) => {
    const result = await db.query(
        `SELECT 
            pr.employee_id, e.first_name, e.last_name, e.employee_id as emp_code,
        d.name as department, des.name as designation,
        pr.basic_pay, pr.hra, pr.other_allowances,
        pr.gross_pay, pr.deductions, pr.net_pay, pr.tax,
        pr.pf_employee, pr.pf_employer, pr.esi_employee, pr.esi_employer,
        pr.professional_tax, pr.tds_amount, pr.lop_days, pr.lop_deduction,
        e.bank_name, e.account_number, e.ifsc_code
         FROM payroll_results pr
         JOIN employees e ON e.id = pr.employee_id
         LEFT JOIN departments d ON d.id = pr.department_id
         LEFT JOIN designations des ON des.id = pr.designation_id
         WHERE pr.payroll_run_id = $1
         ORDER BY e.first_name ASC`,
        [runId]
    );
    return result.rows;
};

const releasePayroll = async (tenantId, runId, userId) => {
    const run = await db.query(`SELECT verification_status FROM payroll_runs WHERE id = $1`, [runId]);
    if (run.rows[0].verification_status !== 'APPROVED') {
        throw new Error("Cannot release payroll without Approval");
    }

    await db.query(
        `UPDATE payroll_runs 
         SET stage = 'RELEASE', status = 'RELEASED', released_at = NOW() 
         WHERE id = $1`,
        [runId]
    );

    // Formally mark linked arrears as PAID
    const arrearsService = require('../arrears/arrears.service');
    await arrearsService.finalizeArrearsForPayrun(tenantId, runId);

    try {
        await payslipService.generateBulk(tenantId, runId);
    } catch (err) {
        console.error("Failed to generate bulk payslips:", err);
    }

    await logAuditEntry(runId, userId, 'PAYROLL_RELEASED', { timestamp: new Date().toISOString() });
    return { message: "Payroll Released Successfully" };
};

// ===================================================================
// AUDIT LOG & HISTORY
// ===================================================================

const getAuditLog = async (tenantId, runId) => {
    const res = await db.query(
        `SELECT pal.*, e.first_name, e.last_name, u.email
         FROM payroll_audit_log pal
         LEFT JOIN users u ON u.id = pal.performed_by
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE pal.payroll_run_id = $1
         ORDER BY pal.created_at ASC`,
        [runId]
    );
    return res.rows.map(a => ({
        id: a.id,
        action: a.action,
        performedBy: a.first_name ? `${a.first_name} ${a.last_name}` : 'System',
        email: a.email,
        details: a.details,
        timestamp: a.created_at
    }));
};

const getPayrollHistory = async (tenantId) => {
    const res = await db.query(
        `SELECT pr.id, pr.period_month, pr.period_year, pr.stage, pr.status,
        pr.verification_status, pr.created_at, pr.released_at,
        COALESCE(pr.total_gross, 0) as total_gross,
        COALESCE(pr.total_net, 0) as total_net,
        COALESCE(pr.total_employees, 0) as total_employees
         FROM payroll_runs pr
         WHERE pr.tenant_id = $1
         ORDER BY pr.period_year DESC, pr.period_month DESC
         LIMIT 12`,
        [tenantId]
    );
    return res.rows;
};

module.exports = {
    getDashboardStats,
    getReviewData,
    updateChecklist,
    initiatePayroll,
    getVerificationData,
    submitApproval,
    releasePayroll,
    createRun,
    getSalaryRegister,
    getReleaseSummary,
    getBankFileData,
    getAuditLog,
    getPayrollHistory,
    logAuditEntry
};
