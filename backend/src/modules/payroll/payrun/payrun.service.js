const db = require("../../../config/db");
const attendanceService = require("../../attendance/attendance.service");
const statutoryCalculator = require("../utils/statutoryCalculator");
const salaryStructureService = require("../salary/salaryStructure.service");

// ===================================================================
// PAY SCHEDULES
// ===================================================================

const createSchedule = async (tenantId, userId, payload) => {
    const { name, cycle, payDay, cutOffDay, isDefault } = payload;

    if (isDefault) {
        await db.query(
            `UPDATE pay_schedules SET is_default = FALSE WHERE tenant_id = $1`,
            [tenantId]
        );
    }

    const result = await db.query(
        `INSERT INTO pay_schedules (tenant_id, name, cycle, pay_day, cut_off_day, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [tenantId, name, cycle || 'MONTHLY', payDay || 28, cutOffDay || 25, isDefault || false]
    );

    return result.rows[0];
};

const getSchedules = async (tenantId) => {
    const result = await db.query(
        `SELECT * FROM pay_schedules WHERE tenant_id = $1 AND is_active = TRUE ORDER BY is_default DESC`,
        [tenantId]
    );
    return result.rows;
};

// ===================================================================
// PAYROLL RUNS
// ===================================================================

const generateRunNumber = (year, month) => {
    return `PR-${year}-${String(month).padStart(2, '0')}`;
};

const createPayrun = async (tenantId, userId, payload) => {
    const { scheduleId, periodMonth, periodYear, payDate } = payload;

    // Check for existing payrun
    const existing = await db.query(
        `SELECT id, status, run_number FROM payroll_runs 
     WHERE tenant_id = $1 AND period_month = $2 AND period_year = $3 AND status != 'REVOKED'`,
        [tenantId, periodMonth, periodYear]
    );

    if (existing.rowCount > 0) {
        const run = existing.rows[0];
        // If it's still in DRAFT or CALCULATING, we can reuse it
        if (['DRAFT', 'CALCULATING'].includes(run.status)) {
            return run;
        }

        // Allow resetting PENDING_APPROVAL, REJECTED, or APPROVED to DRAFT for regeneration
        if (['PENDING_APPROVAL', 'REJECTED', 'APPROVED'].includes(run.status)) {
            await db.query(
                `UPDATE payroll_runs SET status = 'DRAFT', updated_at = now() WHERE id = $1`,
                [run.id]
            );
            return { ...run, status: 'DRAFT' };
        }

        throw new Error(`Payrun for ${periodMonth}/${periodYear} already exists (Status: ${run.status})`);
    }

    // Calculate period dates
    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    const periodEnd = new Date(periodYear, periodMonth, 0); // Last day of month

    const result = await db.query(
        `INSERT INTO payroll_runs (
      tenant_id, schedule_id, run_number, period_month, period_year,
      period_start, period_end, pay_date, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT', $9)
    RETURNING *`,
        [
            tenantId, scheduleId || null, generateRunNumber(periodYear, periodMonth),
            periodMonth, periodYear, periodStart, periodEnd,
            payDate || periodEnd, userId
        ]
    );

    return result.rows[0];
};

const getPayruns = async (tenantId, filters = {}) => {
    let query = `SELECT * FROM payroll_runs WHERE tenant_id = $1`;
    const params = [tenantId];
    let idx = 2;

    if (filters.year) {
        query += ` AND period_year = $${idx++}`;
        params.push(filters.year);
    }

    if (filters.status) {
        query += ` AND status = $${idx++}`;
        params.push(filters.status);
    }

    query += ` ORDER BY period_year DESC, period_month DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

const getPayrunById = async (tenantId, payrunId) => {
    const result = await db.query(
        `SELECT * FROM payroll_runs WHERE tenant_id = $1 AND id = $2`,
        [tenantId, payrunId]
    );
    return result.rows[0];
};

const getPayrunItems = async (tenantId, payrunId) => {
    const result = await db.query(
        `SELECT pri.*, e.first_name, e.last_name, e.employee_id as emp_code
     FROM payroll_run_items pri
     JOIN employees e ON e.id = pri.employee_id
     WHERE pri.tenant_id = $1 AND pri.payroll_run_id = $2
     ORDER BY e.first_name, e.last_name`,
        [tenantId, payrunId]
    );
    return result.rows;
};

// ===================================================================
// CALCULATE PAYRUN
// ===================================================================

const calculatePayrun = async (tenantId, payrunId, userId) => {
    const payrun = await getPayrunById(tenantId, payrunId);

    if (!payrun) {
        throw new Error('Payrun not found');
    }

    if (payrun.status !== 'DRAFT') {
        throw new Error('Can only calculate DRAFT payruns');
    }

    // 1. Auto-Repair block: Ensure all active employees with CTC have a salary assignment if a default structure exists.
    // We do this BEFORE starting the transaction so that the transaction can see the newly created assignments
    // which are committed in separate connections by the salaryStructureService.
    const defaultStructureRes = await db.query(
        `SELECT id FROM salary_structures WHERE tenant_id = $1 AND is_default = TRUE AND is_active = TRUE LIMIT 1`,
        [tenantId]
    );
    const defaultStructureId = defaultStructureRes.rows[0]?.id;

    if (defaultStructureId) {
        const missingAssignments = await db.query(
            `SELECT e.id, esd.ctc, e.join_date
             FROM employees e
             JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = TRUE
             LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
             WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.is_deleted = FALSE AND esa.id IS NULL AND esd.ctc > 0`,
            [tenantId]
        );

        for (const emp of missingAssignments.rows) {
            try {
                await salaryStructureService.assignEmployeeSalary(tenantId, emp.id, {
                    structure_id: defaultStructureId,
                    annual_ctc: parseFloat(emp.ctc),
                    effective_from: emp.join_date || payrun.period_start,
                    revision_reason: 'Auto-assignment during payroll calculation'
                }, userId);
            } catch (err) {
                console.error(`[calculatePayrun] Failed to auto-assign structure for employee ${emp.id}:`, err);
            }
        }
    }

    // Get a client from the pool for transaction
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Update status to CALCULATING
        await client.query(
            `UPDATE payroll_runs SET status = 'CALCULATING', updated_at = now() WHERE id = $1`,
            [payrunId]
        );

        // Clear existing items if any (Idempotency)
        await client.query(
            `DELETE FROM payroll_run_items WHERE payroll_run_id = $1`,
            [payrunId]
        );

        const periodEndStr = payrun.period_end.toISOString().split('T')[0];

        // Get all employees with salary assignments who joined before/during this period
        const employees = await client.query(
            `SELECT esa.id as assignment_id, esa.employee_id as emp_id, esa.annual_ctc as ctc,
                    e.first_name, e.last_name, e.join_date, e.gender, e.date_of_birth
             FROM employee_salary_assignments esa
             JOIN employees e ON e.id = esa.employee_id
             WHERE esa.tenant_id = $1 
               AND esa.is_current = TRUE 
               AND e.status = 'ACTIVE' 
               AND e.is_deleted = FALSE
               AND (e.join_date <= $2 OR e.join_date IS NULL)`,
            [tenantId, periodEndStr]
        );

        if (employees.rowCount === 0) {
            const activeEmpCount = await client.query(
                `SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND status = 'ACTIVE' AND is_deleted = FALSE`,
                [tenantId]
            );

            if (parseInt(activeEmpCount.rows[0].count) > 0) {
                const hasAnyAssignments = await client.query(
                    `SELECT COUNT(*) FROM employee_salary_assignments WHERE tenant_id = $1 AND is_current = TRUE`,
                    [tenantId]
                );

                let diagMessage = "No eligible employees found for this pay period.";
                if (parseInt(hasAnyAssignments.rows[0].count) === 0) {
                    diagMessage = "No employees have a Salary Structure assigned. Please go to 'Salary Structures' settings and click 'Seed Defaults', or assign structures manually to employees.";
                } else {
                    diagMessage = "Eligible employees found with structures, but they might have joined after this pay period or are not marked as ACTIVE.";
                }
                throw new Error(diagMessage);
            }

            console.warn(`[calculatePayrun] No active employees found for tenant ${tenantId}`);
            await client.query(
                `UPDATE payroll_runs SET status = 'DRAFT', updated_at = now() WHERE id = $1`,
                [payrunId]
            );
            await client.query('COMMIT');
            return await getPayrunById(tenantId, payrunId);
        }

        // Get statutory config
        const statutoryRes = await client.query(
            `SELECT * FROM statutory_config WHERE tenant_id = $1`,
            [tenantId]
        );
        const statutory = statutoryRes.rows[0] || {};

        // Calculate for each employee
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let totalEmployees = 0;

        const periodStart = payrun.period_start.toISOString().split('T')[0];
        const periodEnd = payrun.period_end.toISOString().split('T')[0];

        for (const emp of employees.rows) {
            const result = await calculateEmployeePayrollWithClient(
                client, tenantId, emp, payrun, statutory, periodStart, periodEnd
            );

            // Insert payroll run item
            const priResult = await client.query(
                `INSERT INTO payroll_run_items (
                    tenant_id, payroll_run_id, employee_id,
                    total_working_days, payable_days, present_days, absent_days,
                    leave_days, lop_days, holidays, weekends,
                    gross_salary, basic, hra, da, special_allowance, other_allowance,
                    reimbursements, total_earnings,
                    pf_employee, pf_employer, esi_employee, esi_employer,
                    professional_tax, tds, loan_deduction, lop_deduction, lwf_employee, total_deductions,
                    net_salary, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 'PENDING')
                RETURNING id`,
                [
                    tenantId, payrunId, emp.emp_id,
                    result.totalWorkingDays, result.payableDays, result.presentDays, result.absentDays,
                    result.leaveDays, result.lopDays, result.holidays, result.weekends,
                    result.gross, result.basic, result.hra, result.da, result.specialAllowance, result.otherAllowance,
                    result.reimbursements, result.totalEarnings,
                    result.pfEmployee, result.pfEmployer, result.esiEmployee, result.esiEmployer,
                    result.professionalTax, result.tds, result.loanDeduction, result.lopDeduction, result.lwfEmployee, result.totalDeductions,
                    result.netSalary
                ]
            );

            const priId = priResult.rows[0].id;

            // Insert components breakdown forpayslip
            for (const comp of result.components) {
                await client.query(
                    `INSERT INTO payroll_run_item_components (
                        tenant_id, payroll_run_item_id, component_id, name, code, amount, component_type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [tenantId, priId, comp.component_id, comp.name, comp.code, comp.amount, comp.type]
                );
            }

            totalGross += result.gross;
            totalDeductions += result.totalDeductions;
            totalNet += result.netSalary;
            totalEmployees++;
        }

        // Update payrun totals
        await client.query(
            `UPDATE payroll_runs 
             SET status = 'PENDING_APPROVAL',
                 total_employees = $1,
                 total_gross = $2,
                 total_deductions = $3,
                 total_net = $4,
                 updated_at = now()
             WHERE id = $5`,
            [totalEmployees, totalGross, totalDeductions, totalNet, payrunId]
        );

        await client.query('COMMIT');
        return await getPayrunById(tenantId, payrunId);

    } catch (error) {
        await client.query('ROLLBACK');
        // Reset to DRAFT status
        await db.query(
            `UPDATE payroll_runs SET status = 'DRAFT' WHERE id = $1`,
            [payrunId]
        );
        throw error;
    } finally {
        client.release();
    }
};

// Helper to calculate age from date of birth or date of joining
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 30; // Default age if not provided
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Helper function that uses a transaction client
const calculateEmployeePayrollWithClient = async (client, tenantId, emp, payrun, statutory, periodStart, periodEnd) => {
    // Get attendance summary
    const attendance = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days,
           COUNT(*) FILTER (WHERE status = 'HALF_DAY') as half_days,
           COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days
         FROM attendance 
         WHERE tenant_id = $1 AND employee_id = $2 
           AND date BETWEEN $3 AND $4`,
        [tenantId, emp.emp_id, periodStart, periodEnd]
    );

    const attData = attendance.rows[0] || { present_days: 0, half_days: 0, absent_days: 0 };

    // Get approved leaves — compute actual overlap with this pay period
    const leaves = await client.query(
        `SELECT SUM(
            GREATEST(0, 
                LEAST(end_date, $4::date) - GREATEST(start_date, $3::date) + 1
            )
        ) as leave_days
         FROM leave_applications 
         WHERE tenant_id = $1 AND employee_id = $2 
           AND status = 'APPROVED'
           AND start_date <= $4 AND end_date >= $3`,
        [tenantId, emp.emp_id, periodStart, periodEnd]
    );

    const leaveDays = parseFloat(leaves.rows[0]?.leave_days || 0);

    // Get unpaid leaves (LOP) — compute actual overlap with this pay period
    const lopLeaves = await client.query(
        `SELECT SUM(
            GREATEST(0, 
                LEAST(la.end_date, $4::date) - GREATEST(la.start_date, $3::date) + 1
            )
        ) as lop_days
         FROM leave_applications la
         JOIN leave_types lt ON lt.id = la.leave_type_id
         WHERE la.tenant_id = $1 AND la.employee_id = $2 
           AND la.status = 'APPROVED' AND lt.is_paid = FALSE
           AND la.start_date <= $4 AND la.end_date >= $3`,
        [tenantId, emp.emp_id, periodStart, periodEnd]
    );

    const lopDays = parseFloat(lopLeaves.rows[0]?.lop_days || 0);

    // Get loan deductions
    const loanDeductions = await client.query(
        `SELECT SUM(installment_amount) as total
         FROM employee_loan_installments
         WHERE tenant_id = $1 AND employee_id = $2 
           AND payment_status = 'PENDING'
           AND due_month <= $3`,
        [tenantId, emp.emp_id, periodEnd]
    );

    const loanDeduction = parseFloat(loanDeductions.rows[0]?.total || 0);

    // Get approved reimbursement claims
    const reimbursements = await client.query(
        `SELECT SUM(amount) as total
         FROM reimbursement_claims
         WHERE tenant_id = $1 AND employee_id = $2 
           AND status = 'APPROVED'
           AND paid_in_payrun_id IS NULL`,
        [tenantId, emp.emp_id]
    );

    const reimbursementTotal = parseFloat(reimbursements.rows[0]?.total || 0);

    // Get actual holidays count
    const holidaysRes = await client.query(
        `SELECT COUNT(*) as count FROM holidays 
         WHERE tenant_id = $1 AND date BETWEEN $2 AND $3`,
        [tenantId, periodStart, periodEnd]
    );
    const holidays = parseInt(holidaysRes.rows[0]?.count || 0);

    // Calculate actual weekends
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    let weekends = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) weekends++;
    }

    // Calculate days
    const totalDaysInMonth = new Date(payrun.period_year, payrun.period_month, 0).getDate();
    const totalWorkingDays = totalDaysInMonth - holidays - weekends;

    const halfDays = parseInt(attData.half_days) || 0;
    const presentDays = parseInt(attData.present_days) + (halfDays * 0.5);
    const absentDays = parseInt(attData.absent_days);
    // Half-days from attendance count as 0.5 LOP each (if not already covered by a leave)
    const attendanceBasedLop = halfDays * 0.5;
    const payableDays = totalWorkingDays - lopDays - attendanceBasedLop;

    // Calculate salary components from dynamic structure
    const monthlyCtc = parseFloat(emp.ctc) / 12;
    const perDaySalary = monthlyCtc / totalDaysInMonth;

    // Fetch component values for this assignment with their types
    const componentsRes = await client.query(
        `SELECT sc.id, sc.name, sc.code, escv.monthly_amount, sc.component_type 
         FROM employee_salary_component_values escv
         JOIN salary_components sc ON sc.id = escv.component_id
         WHERE escv.assignment_id = $1`,
        [emp.assignment_id]
    );

    const compMap = {};
    const compDetails = [];
    componentsRes.rows.forEach(c => {
        const amount = parseFloat(c.monthly_amount);
        compMap[c.code] = amount;
        compDetails.push({
            component_id: c.id,
            name: c.name,
            code: c.code,
            amount,
            type: c.component_type
        });
    });

    // Map to standard variables for legacy compatibility
    // Note: Check for multiple code variants to handle different naming conventions
    const basic = compMap['BASIC'] || 0;
    const hra = compMap['HRA'] || 0;
    const da = compMap['DA'] || 0;
    // Special Allowance can be coded as 'SPECIAL_ALLOWANCE', 'SPECIAL', or 'SA'
    const specialAllowance = compMap['SPECIAL_ALLOWANCE'] || compMap['SPECIAL'] || compMap['SA'] || 0;

    // Only sum EARNING type components for otherAllowance (excluding major ones)
    const otherAllowance = compDetails
        .filter(c => c.type === 'EARNING' && !['BASIC', 'HRA', 'DA', 'SPECIAL_ALLOWANCE', 'SPECIAL', 'SA'].includes(c.code))
        .reduce((sum, c) => sum + c.amount, 0);

    // Gross should strictly be the sum of all EARNING type components
    const gross = compDetails
        .filter(c => c.type === 'EARNING')
        .reduce((sum, c) => sum + c.amount, 0);

    // Get custom PT slabs from database
    const ptSlabsRes = await client.query(
        `SELECT min_salary as min, max_salary as max, monthly_tax as tax 
         FROM pt_slabs 
         WHERE tenant_id = $1 AND (state = $2 OR state IS NULL)
         ORDER BY min_salary ASC`,
        [tenantId, statutory.pt_state || 'Karnataka']
    );
    const customPTSlabs = ptSlabsRes.rows;

    // Calculate all statutory deductions using the comprehensive calculator
    const statutoryResult = statutoryCalculator.calculateAllStatutory(
        { basic, da, hra, gross },
        statutory,
        {
            age: calculateAge(emp.date_of_birth),
            state: statutory.pt_state || 'Karnataka',
            gender: emp.gender || 'MALE',
            vpfRate: emp.vpf_rate || 0
        },
        payrun.period_month,
        customPTSlabs
    );

    // Extract values from calculator
    const { pf, esi, pt, lwf } = statutoryResult;

    const pfEmployee = pf.pfEmployee + pf.vpfEmployee;
    const pfEmployer = pf.totalEmployerCost || pf.pfEmployer;
    const esiEmployee = esi.esiEmployee;
    const esiEmployer = esi.esiEmployer;
    const professionalTax = pt.professionalTax;
    const lwfEmployee = lwf.lwfEmployee;

    // LOP Deduction
    const lopDeduction = lopDays * perDaySalary;

    // TDS (simplified - actual calculation is complex)
    const tds = 0; // TODO: Implement based on tax declarations

    // Total calculations
    // Use values from structure if they exist (overrides), otherwise use calculated values
    // CRITICAL FIX: Use ?? (nullish coalescing) instead of || to properly handle 0 values
    // Also check all possible code variants to ensure we don't miss the component

    // Helper to get first defined value from compMap for given codes
    const getStructureValue = (...codes) => {
        for (const code of codes) {
            if (compMap[code] !== undefined && compMap[code] !== null) {
                return compMap[code];
            }
        }
        return undefined;
    };

    // Get deduction values from structure (if present) or fall back to statutory calculated values
    // IMPORTANT: Include ALL possible code variants including 'PF(EMPLOYEE)' which is used in your DB
    const structurePfEmployee = getStructureValue('PF_EE', 'PF_EMPLOYEE', 'PF', 'PROVIDENT_FUND', 'PF(EMPLOYEE)');
    const structureEsiEmployee = getStructureValue('ESI_EE', 'ESI_EMPLOYEE', 'ESI', 'ESI(EMPLOYEE)');
    const structurePT = getStructureValue('PT', 'PROFESSIONAL_TAX');
    const structureLwf = getStructureValue('LWF', 'LWF_EMPLOYEE');

    // Use structure value if defined (even if 0), otherwise use statutory calculated value
    const finalPfEmployee = structurePfEmployee !== undefined ? structurePfEmployee : pfEmployee;
    const finalEsiEmployee = structureEsiEmployee !== undefined ? structureEsiEmployee : esiEmployee;
    const finalProfessionalTax = structurePT !== undefined ? structurePT : professionalTax;
    const finalLwfEmployee = structureLwf !== undefined ? structureLwf : lwfEmployee;

    const totalEarnings = gross + reimbursementTotal;
    const totalDeductions = finalPfEmployee + finalEsiEmployee + finalProfessionalTax + finalLwfEmployee + tds + loanDeduction + lopDeduction;
    const netSalary = totalEarnings - totalDeductions;

    // ================================================================
    // ADD STATUTORY DEDUCTIONS TO COMPONENTS FOR PAYSLIP DISPLAY
    // ================================================================
    // These are calculated above but need to be added to compDetails
    // so they appear in the payslip PDF breakdown

    // Check for existing components using both standard codes and potential variations
    // The DB uses PF_EE, PF_ER, ESI_EE, ESI_ER
    // IMPORTANT: Check for all code variants to prevent duplicate entries

    // Helper to check if a component code exists in compMap (with non-zero value)
    const hasComponent = (...codes) => codes.some(code => compMap[code] !== undefined && compMap[code] !== null);

    // Include 'PF(EMPLOYEE)' code variant used in your database
    if (pfEmployee > 0 && !hasComponent('PF_EMPLOYEE', 'PF_EE', 'PF', 'PF(EMPLOYEE)')) {
        compDetails.push({
            component_id: null,
            name: 'Provident Fund (Employee)',
            code: 'PF_EE', // Use standard DB code
            amount: pfEmployee,
            type: 'DEDUCTION'
        });
    }

    if (pfEmployer > 0 && !hasComponent('PF_EMPLOYER', 'PF_ER')) {
        compDetails.push({
            component_id: null,
            name: 'Provident Fund (Employer)',
            code: 'PF_ER', // Use standard DB code
            amount: pfEmployer,
            type: 'EMPLOYER_CONTRIBUTION'
        });
    }

    if (esiEmployee > 0 && !hasComponent('ESI_EMPLOYEE', 'ESI_EE', 'ESI')) {
        compDetails.push({
            component_id: null,
            name: 'ESI (Employee)',
            code: 'ESI_EE', // Use standard DB code
            amount: esiEmployee,
            type: 'DEDUCTION'
        });
    }

    if (esiEmployer > 0 && !hasComponent('ESI_EMPLOYER', 'ESI_ER')) {
        compDetails.push({
            component_id: null,
            name: 'ESI (Employer)',
            code: 'ESI_ER', // Use standard DB code
            amount: esiEmployer,
            type: 'EMPLOYER_CONTRIBUTION'
        });
    }

    // CRITICAL FIX: Check both 'PT' and 'PROFESSIONAL_TAX' codes to prevent duplicate PT entries
    if (professionalTax > 0 && !hasComponent('PT', 'PROFESSIONAL_TAX')) {
        compDetails.push({
            component_id: null,
            name: 'Professional Tax',
            code: 'PT',
            amount: professionalTax,
            type: 'DEDUCTION'
        });
    }

    if (lwfEmployee > 0 && !hasComponent('LWF', 'LWF_EMPLOYEE')) {
        compDetails.push({
            component_id: null,
            name: 'Labour Welfare Fund',
            code: 'LWF',
            amount: lwfEmployee,
            type: 'DEDUCTION'
        });
    }

    // NOTE: Gratuity is NOT added here because it already comes from the
    // salary structure components (employee_salary_component_values).
    // Adding it here would cause duplication on the payslip.

    return {
        totalWorkingDays,
        payableDays,
        presentDays,
        absentDays,
        leaveDays,
        lopDays,
        holidays,
        weekends,
        gross,
        basic,
        hra,
        da,
        specialAllowance,
        otherAllowance,
        reimbursements: reimbursementTotal,
        totalEarnings,
        pfEmployee: finalPfEmployee,
        pfEmployer,
        esiEmployee: finalEsiEmployee,
        esiEmployer,
        professionalTax: finalProfessionalTax,
        lwfEmployee: finalLwfEmployee,
        tds,
        loanDeduction,
        lopDeduction,
        totalDeductions,
        netSalary,
        components: compDetails
    };
};

// NOTE: Legacy calculateEmployeePayroll function removed — it was dead code.
// All payrun calculations use calculateEmployeePayrollWithClient (transactional) above.

// ===================================================================
// PAYRUN WORKFLOW
// ===================================================================

const approvePayrun = async (tenantId, payrunId, userId) => {
    const result = await db.query(
        `UPDATE payroll_runs 
     SET status = 'APPROVED', approved_by = $1, approved_at = now(), updated_at = now()
     WHERE tenant_id = $2 AND id = $3 AND status = 'PENDING_APPROVAL'
     RETURNING *`,
        [userId, tenantId, payrunId]
    );

    if (result.rowCount === 0) {
        throw new Error('Payrun not found or not in pending approval status');
    }

    return result.rows[0];
};

const rejectPayrun = async (tenantId, payrunId, userId, reason) => {
    const result = await db.query(
        `UPDATE payroll_runs 
     SET status = 'REJECTED', rejected_by = $1, rejected_at = now(), 
         rejection_reason = $2, updated_at = now()
     WHERE tenant_id = $3 AND id = $4 AND status = 'PENDING_APPROVAL'
     RETURNING *`,
        [userId, reason || null, tenantId, payrunId]
    );

    if (result.rowCount === 0) {
        throw new Error('Payrun not found or not in pending approval status');
    }

    return result.rows[0];
};

const revokePayrun = async (tenantId, payrunId, userId) => {
    const payrun = await getPayrunById(tenantId, payrunId);

    if (!payrun) {
        throw new Error('Payrun not found');
    }

    if (payrun.is_locked) {
        throw new Error('Cannot revoke locked payrun');
    }

    if (!['APPROVED', 'PENDING_APPROVAL'].includes(payrun.status)) {
        throw new Error('Can only revoke approved or pending approval payruns');
    }

    const result = await db.query(
        `UPDATE payroll_runs 
     SET status = 'REVOKED', updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
        [tenantId, payrunId]
    );

    return result.rows[0];
};

const deletePayrun = async (tenantId, payrunId) => {
    const payrun = await getPayrunById(tenantId, payrunId);

    if (!payrun) {
        throw new Error('Payrun not found');
    }

    if (!['DRAFT', 'CALCULATED', 'PENDING_APPROVAL'].includes(payrun.status)) {
        throw new Error('Can only delete DRAFT, CALCULATED, or PENDING_APPROVAL payruns. Use Void for approved/paid runs.');
    }

    if (payrun.is_locked) {
        throw new Error('Cannot delete a locked payrun');
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Delete components first (child of items)
        await client.query(
            `DELETE FROM payroll_run_item_components WHERE payroll_run_item_id IN (
                SELECT id FROM payroll_run_items WHERE payroll_run_id = $1
            )`,
            [payrunId]
        );

        // Delete items
        await client.query(
            `DELETE FROM payroll_run_items WHERE payroll_run_id = $1`,
            [payrunId]
        );

        // Delete the payrun itself
        await client.query(
            `DELETE FROM payroll_runs WHERE tenant_id = $1 AND id = $2`,
            [tenantId, payrunId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return { deleted: true };
};

// Void a payrun (for APPROVED/PAID — keeps data for audit trail)
const voidPayrun = async (tenantId, payrunId, userId) => {
    const payrun = await getPayrunById(tenantId, payrunId);

    if (!payrun) {
        throw new Error('Payrun not found');
    }

    if (payrun.is_locked) {
        throw new Error('Cannot void a locked payrun');
    }

    if (!['APPROVED', 'PAID', 'PENDING_APPROVAL', 'CALCULATED'].includes(payrun.status)) {
        throw new Error(`Cannot void payrun with status ${payrun.status}. Use delete for DRAFT payruns.`);
    }

    const result = await db.query(
        `UPDATE payroll_runs 
         SET status = 'VOIDED', voided_by = $1, voided_at = now(), updated_at = now()
         WHERE tenant_id = $2 AND id = $3
         RETURNING *`,
        [userId, tenantId, payrunId]
    );

    return result.rows[0];
};

// Delete a single payslip item (payroll_run_item + its components)
const deletePayslipItem = async (tenantId, payrunId, itemId) => {
    const payrun = await getPayrunById(tenantId, payrunId);

    if (!payrun) {
        throw new Error('Payrun not found');
    }

    if (payrun.is_locked) {
        throw new Error('Cannot delete payslip from a locked payrun');
    }

    // Verify the item belongs to this payrun and tenant
    const itemCheck = await db.query(
        `SELECT id FROM payroll_run_items WHERE id = $1 AND payroll_run_id = $2 AND tenant_id = $3`,
        [itemId, payrunId, tenantId]
    );

    if (itemCheck.rowCount === 0) {
        throw new Error('Payslip item not found in this payrun');
    }

    // Delete components first
    await db.query(
        `DELETE FROM payroll_run_item_components WHERE payroll_run_item_id = $1 AND tenant_id = $2`,
        [itemId, tenantId]
    );

    // Delete the item
    await db.query(
        `DELETE FROM payroll_run_items WHERE id = $1 AND tenant_id = $2`,
        [itemId, tenantId]
    );

    // Update payrun totals
    const totals = await db.query(
        `SELECT COUNT(*) as total_employees, 
                COALESCE(SUM(gross_salary), 0) as total_gross,
                COALESCE(SUM(total_deductions), 0) as total_deductions,
                COALESCE(SUM(net_salary), 0) as total_net
         FROM payroll_run_items WHERE payroll_run_id = $1`,
        [payrunId]
    );

    const t = totals.rows[0];
    await db.query(
        `UPDATE payroll_runs SET total_employees = $1, total_gross = $2, total_deductions = $3, total_net = $4, updated_at = now() WHERE id = $5`,
        [t.total_employees, t.total_gross, t.total_deductions, t.total_net, payrunId]
    );

    return { deleted: true };
};

const lockPayrun = async (tenantId, payrunId, userId) => {
    const result = await db.query(
        `UPDATE payroll_runs 
     SET is_locked = TRUE, locked_by = $1, locked_at = now(), updated_at = now()
     WHERE tenant_id = $2 AND id = $3 AND status = 'APPROVED' AND is_locked = FALSE
     RETURNING *`,
        [userId, tenantId, payrunId]
    );

    if (result.rowCount === 0) {
        throw new Error('Payrun not found, not approved, or already locked');
    }

    return result.rows[0];
};

module.exports = {
    // Schedules
    createSchedule,
    getSchedules,

    // Payruns
    createPayrun,
    getPayruns,
    getPayrunById,
    getPayrunItems,
    calculatePayrun,

    // Workflow
    approvePayrun,
    rejectPayrun,
    revokePayrun,
    deletePayrun,
    voidPayrun,
    deletePayslipItem,
    lockPayrun
};
