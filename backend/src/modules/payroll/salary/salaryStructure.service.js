const db = require('../../../config/db');
const arrearsService = require('../arrears/arrears.service');

// =====================================================
// SAFE FORMULA EVALUATOR (used by CTC Calculator)
// =====================================================

/**
 * Safely evaluates a salary formula string within a restricted context.
 * Only allows basic arithmetic on known variables.
 * Returns 0 and logs a warning on any failure.
 */
const evaluateFormulaSafe = (formula, context = {}) => {
    if (!formula || typeof formula !== 'string') return 0;
    try {
        // Build a sandboxed function with only numeric context variables
        const keys = Object.keys(context);
        const values = keys.map(k => Number(context[k]) || 0);

        // Restrict to basic math operators and known variable names
        const sanitized = formula.replace(/[^a-zA-Z0-9_+\-*/().\s]/g, '');

        // eslint-disable-next-line no-new-func
        const fn = new Function(...keys, `"use strict"; return (${sanitized});`);
        const result = fn(...values);

        if (!Number.isFinite(result)) {
            console.warn(`[CTC] Formula "${formula}" produced non-finite result (${result}), defaulting to 0`);
            return 0;
        }
        return result;
    } catch (err) {
        console.warn(`[CTC] Formula evaluation failed for "${formula}": ${err.message}`);
        return 0;
    }
};

// =====================================================
// SALARY COMPONENTS
// =====================================================

exports.listSalaryComponents = async (tenantId, filters = {}) => {
    let query = `
        SELECT id, name, code, component_type, category, is_taxable, 
               is_pro_rata, is_statutory, statutory_code, is_active, 
               display_order, description, created_at
        FROM salary_components 
        WHERE tenant_id = $1
    `;
    const params = [tenantId];
    let i = 2;

    if (filters.component_type) {
        query += ` AND component_type = $${i}`;
        params.push(filters.component_type);
        i++;
    }

    if (filters.is_active !== undefined) {
        query += ` AND is_active = $${i}`;
        params.push(filters.is_active);
        i++;
    }

    query += ` ORDER BY display_order, name`;

    const result = await db.query(query, params);
    return result.rows;
};

exports.createSalaryComponent = async (tenantId, data) => {
    const result = await db.query(
        `INSERT INTO salary_components 
         (tenant_id, name, code, component_type, category, is_taxable, 
          is_pro_rata, is_statutory, statutory_code, display_order, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            tenantId,
            data.name,
            data.code,
            data.component_type || 'EARNING',
            data.category,
            data.is_taxable ?? true,
            data.is_pro_rata ?? true,
            data.is_statutory ?? false,
            data.statutory_code,
            data.display_order || 0,
            data.description
        ]
    );
    return result.rows[0];
};

exports.updateSalaryComponent = async (tenantId, componentId, data) => {
    const result = await db.query(
        `UPDATE salary_components 
         SET name = COALESCE($3, name),
             code = COALESCE($4, code),
             component_type = COALESCE($5, component_type),
             category = COALESCE($6, category),
             is_taxable = COALESCE($7, is_taxable),
             is_pro_rata = COALESCE($8, is_pro_rata),
             is_statutory = COALESCE($9, is_statutory),
             statutory_code = COALESCE($10, statutory_code),
             is_active = COALESCE($11, is_active),
             display_order = COALESCE($12, display_order),
             description = COALESCE($13, description),
             updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [
            componentId,
            tenantId,
            data.name,
            data.code,
            data.component_type,
            data.category,
            data.is_taxable,
            data.is_pro_rata,
            data.is_statutory,
            data.statutory_code,
            data.is_active,
            data.display_order,
            data.description
        ]
    );
    return result.rows[0];
};

exports.deleteSalaryComponent = async (tenantId, componentId) => {
    // Soft delete by setting is_active to false
    const result = await db.query(
        `UPDATE salary_components SET is_active = FALSE, updated_at = NOW() 
         WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [componentId, tenantId]
    );
    return result.rowCount > 0;
};

// =====================================================
// SALARY STRUCTURES
// =====================================================

exports.listSalaryStructures = async (tenantId) => {
    const result = await db.query(
        `SELECT s.id, s.name, s.description, s.is_default, s.is_active, s.created_at,
                (SELECT COUNT(*) FROM salary_structure_components WHERE structure_id = s.id) as component_count
         FROM salary_structures s
         WHERE s.tenant_id = $1
         ORDER BY s.is_default DESC, s.name`,
        [tenantId]
    );
    return result.rows;
};

exports.getSalaryStructure = async (tenantId, structureId) => {
    const structureResult = await db.query(
        `SELECT * FROM salary_structures WHERE id = $1 AND tenant_id = $2`,
        [structureId, tenantId]
    );

    if (!structureResult.rows[0]) return null;

    const componentsResult = await db.query(
        `SELECT ssc.*, sc.name as component_name, sc.code as component_code, 
                sc.component_type, sc.category, sc.is_taxable
         FROM salary_structure_components ssc
         JOIN salary_components sc ON sc.id = ssc.component_id
         WHERE ssc.structure_id = $1 AND ssc.tenant_id = $2
         ORDER BY ssc.display_order`,
        [structureId, tenantId]
    );

    return {
        ...structureResult.rows[0],
        components: componentsResult.rows
    };
};

exports.createSalaryStructure = async (tenantId, userId, data) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // If this is set as default, unset other defaults
        if (data.is_default) {
            await client.query(
                `UPDATE salary_structures SET is_default = FALSE WHERE tenant_id = $1`,
                [tenantId]
            );
        }

        const structureResult = await client.query(
            `INSERT INTO salary_structures (tenant_id, name, description, is_default, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [tenantId, data.name, data.description, data.is_default || false, data.is_active ?? true, userId]
        );

        const structure = structureResult.rows[0];

        // Add components if provided
        if (data.components && data.components.length > 0) {
            for (const comp of data.components) {
                await client.query(
                    `INSERT INTO salary_structure_components 
                     (tenant_id, structure_id, component_id, calculation_type, percentage, fixed_amount, formula, min_value, max_value, display_order)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        tenantId,
                        structure.id,
                        comp.component_id,
                        comp.calculation_type || 'PERCENTAGE_OF_CTC',
                        comp.percentage,
                        comp.fixed_amount,
                        comp.formula,
                        comp.min_value,
                        comp.max_value,
                        comp.display_order || 0
                    ]
                );
            }
        }

        await client.query('COMMIT');
        return structure;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.updateSalaryStructure = async (tenantId, structureId, data) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        if (data.is_default) {
            await client.query(
                `UPDATE salary_structures SET is_default = FALSE WHERE tenant_id = $1 AND id != $2`,
                [tenantId, structureId]
            );
        }

        const result = await client.query(
            `UPDATE salary_structures
             SET name = COALESCE($3, name),
                 description = COALESCE($4, description),
                 is_default = COALESCE($5, is_default),
                 is_active = COALESCE($6, is_active),
                 updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING *`,
            [structureId, tenantId, data.name, data.description, data.is_default, data.is_active]
        );

        // Update components if provided
        if (data.components) {
            // Delete existing components
            await client.query(
                `DELETE FROM salary_structure_components WHERE structure_id = $1 AND tenant_id = $2`,
                [structureId, tenantId]
            );

            // Insert new components
            for (const comp of data.components) {
                await client.query(
                    `INSERT INTO salary_structure_components 
                     (tenant_id, structure_id, component_id, calculation_type, percentage, fixed_amount, formula, min_value, max_value, display_order)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        tenantId,
                        structureId,
                        comp.component_id,
                        comp.calculation_type || 'PERCENTAGE_OF_CTC',
                        comp.percentage,
                        comp.fixed_amount,
                        comp.formula,
                        comp.min_value,
                        comp.max_value,
                        comp.display_order || 0
                    ]
                );
            }
        }

        await client.query('COMMIT');

        // Refresh all active assignments for this structure
        try {
            // Get all current assignments for this structure
            // We use a new query to ensure we get the latest state
            const assignments = await client.query(
                `SELECT id, annual_ctc FROM employee_salary_assignments 
                 WHERE tenant_id = $1 AND structure_id = $2 AND is_current = TRUE`,
                [tenantId, structureId]
            );

            for (const assign of assignments.rows) {
                try {
                    // Recalculate breakdown using the UPDATED structure
                    // calculateCTCBreakdown uses getSalaryStructure which fetches from DB.
                    // Since we committed above, it will see the new structure.
                    const breakdown = await exports.calculateCTCBreakdown(tenantId, structureId, assign.annual_ctc);

                    // Update component values
                    // We perform this update using the db pool directly to avoid long transaction on 'client'
                    await db.query('BEGIN');
                    try {
                        // Remove old values
                        await db.query(
                            `DELETE FROM employee_salary_component_values WHERE assignment_id = $1`,
                            [assign.id]
                        );

                        // Insert new values
                        for (const comp of breakdown.breakdown) {
                            await db.query(
                                `INSERT INTO employee_salary_component_values 
                                 (tenant_id, assignment_id, component_id, monthly_amount, annual_amount)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [tenantId, assign.id, comp.component_id, comp.monthly_amount, comp.annual_amount]
                            );
                        }

                        await db.query('COMMIT');
                    } catch (txError) {
                        await db.query('ROLLBACK');
                        throw txError;
                    }
                } catch (assignError) {
                    console.error(`Failed to refresh assignment ${assign.id}:`, assignError);
                }
            }
        } catch (refreshError) {
            console.error('Error refreshing structure assignments:', refreshError);
            // We don't throw here so the structure update remains successful
        }

        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.deleteSalaryStructure = async (tenantId, structureId) => {
    // Check if structure is in use
    const usageCheck = await db.query(
        `SELECT COUNT(*) FROM employee_salary_assignments WHERE structure_id = $1 AND tenant_id = $2`,
        [structureId, tenantId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete structure that is assigned to employees');
    }

    await db.query(
        `DELETE FROM salary_structure_components WHERE structure_id = $1 AND tenant_id = $2`,
        [structureId, tenantId]
    );

    const result = await db.query(
        `DELETE FROM salary_structures WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [structureId, tenantId]
    );

    return result.rowCount > 0;
};

// =====================================================
// CTC CALCULATOR
// =====================================================

exports.calculateCTCBreakdown = async (tenantId, structureId, annualCTC) => {
    // Get structure with components
    const structure = await exports.getSalaryStructure(tenantId, structureId);

    if (!structure) {
        throw new Error('Salary structure not found');
    }

    const breakdown = [];
    let remainingAmount = annualCTC;
    let basicAmount = 0;
    let grossEarnings = 0;
    let totalDeductions = 0;
    let employerContributions = 0;

    // First pass: Calculate non-REMAINING components
    for (const comp of structure.components) {
        if (comp.calculation_type === 'REMAINING') continue;

        let amount = 0;

        switch (comp.calculation_type) {
            case 'FIXED':
                // Treat fixed_amount as Monthly, so Annual is * 12
                amount = (parseFloat(comp.fixed_amount) || 0) * 12;
                break;
            case 'PERCENTAGE_OF_CTC':
                amount = (annualCTC * (parseFloat(comp.percentage) || 0)) / 100;
                break;
            case 'PERCENTAGE_OF_BASIC':
                // Calculate after basic is known
                continue;
            case 'FORMULA':
                // Formulas are calculated in a later pass to ensure dependencies are resolved
                continue;
        }

        // Apply min/max constraints
        if (comp.min_value && amount < parseFloat(comp.min_value)) {
            amount = parseFloat(comp.min_value);
        }
        if (comp.max_value && amount > parseFloat(comp.max_value)) {
            amount = parseFloat(comp.max_value);
        }

        if (comp.component_code === 'BASIC') {
            basicAmount = amount;
        }

        breakdown.push({
            component_id: comp.component_id,
            component_name: comp.component_name,
            component_code: comp.component_code,
            component_type: comp.component_type,
            annual_amount: Math.round(amount * 100) / 100,
            monthly_amount: Math.round((amount / 12) * 100) / 100
        });

        if (comp.component_type === 'EARNING' || comp.component_type === 'REIMBURSEMENT') {
            grossEarnings += amount;
            remainingAmount -= amount;
        } else if (comp.component_type === 'EMPLOYER_CONTRIBUTION') {
            employerContributions += amount;
            remainingAmount -= amount;
        }
    }

    // Second pass: Calculate PERCENTAGE_OF_BASIC components
    for (const comp of structure.components) {
        if (comp.calculation_type !== 'PERCENTAGE_OF_BASIC') continue;

        let amount = (basicAmount * (parseFloat(comp.percentage) || 0)) / 100;

        // Apply max constraint (e.g., PF cap)
        if (comp.max_value && amount > parseFloat(comp.max_value) * 12) {
            amount = parseFloat(comp.max_value) * 12;
        }

        breakdown.push({
            component_id: comp.component_id,
            component_name: comp.component_name,
            component_code: comp.component_code,
            component_type: comp.component_type,
            annual_amount: Math.round(amount * 100) / 100,
            monthly_amount: Math.round((amount / 12) * 100) / 100
        });

        if (comp.component_type === 'EARNING') {
            grossEarnings += amount;
            remainingAmount -= amount;
        } else if (comp.component_type === 'DEDUCTION') {
            totalDeductions += amount;
        } else if (comp.component_type === 'EMPLOYER_CONTRIBUTION') {
            employerContributions += amount;
            remainingAmount -= amount;
        }
    }

    // Third pass: Calculate FORMULA components
    // Build context from previously calculated amounts
    const formulaContext = {
        CTC: annualCTC,
        BASIC: basicAmount,
        GROSS: grossEarnings,
    };
    // Add all previously computed components to the context
    for (const item of breakdown) {
        formulaContext[item.component_code] = item.annual_amount;
    }

    for (const comp of structure.components) {
        if (comp.calculation_type !== 'FORMULA') continue;

        let amount = evaluateFormulaSafe(comp.formula, formulaContext);

        // Apply min/max constraints
        if (comp.min_value != null && amount < parseFloat(comp.min_value)) {
            amount = parseFloat(comp.min_value);
        }
        if (comp.max_value != null && amount > parseFloat(comp.max_value)) {
            amount = parseFloat(comp.max_value);
        }

        breakdown.push({
            component_id: comp.component_id,
            component_name: comp.component_name,
            component_code: comp.component_code,
            component_type: comp.component_type,
            annual_amount: Math.round(amount * 100) / 100,
            monthly_amount: Math.round((amount / 12) * 100) / 100
        });

        if (comp.component_type === 'EARNING' || comp.component_type === 'REIMBURSEMENT') {
            grossEarnings += amount;
            remainingAmount -= amount;
        } else if (comp.component_type === 'DEDUCTION') {
            totalDeductions += amount;
        } else if (comp.component_type === 'EMPLOYER_CONTRIBUTION') {
            employerContributions += amount;
            remainingAmount -= amount;
        }
    }

    // Fourth pass: Calculate REMAINING component (e.g., Special Allowance)
    for (const comp of structure.components) {
        if (comp.calculation_type !== 'REMAINING') continue;

        const amount = Math.max(0, remainingAmount);

        breakdown.push({
            component_id: comp.component_id,
            component_name: comp.component_name,
            component_code: comp.component_code,
            component_type: comp.component_type,
            annual_amount: Math.round(amount * 100) / 100,
            monthly_amount: Math.round((amount / 12) * 100) / 100
        });

        if (comp.component_type === 'EARNING') {
            grossEarnings += amount;
        }
    }

    // Sort breakdown by display_order
    breakdown.sort((a, b) => {
        const orderA = structure.components.find(c => c.component_id === a.component_id)?.display_order || 0;
        const orderB = structure.components.find(c => c.component_id === b.component_id)?.display_order || 0;
        return orderA - orderB;
    });

    // =========================================================
    // CTC ROUNDING TRUE-UP
    // Correct monthly rounding drift so that monthly × 12 = annual.
    // Adjust the REMAINING or first EARNING component.
    // =========================================================
    const totalMonthlyTimes12 = breakdown
        .filter(c => c.component_type === 'EARNING' || c.component_type === 'REIMBURSEMENT')
        .reduce((sum, c) => sum + (c.monthly_amount * 12), 0);
    const roundingDiff = Math.round((grossEarnings - totalMonthlyTimes12) * 100) / 100;

    if (roundingDiff !== 0) {
        // Prefer adjusting the REMAINING component, else the last EARNING
        const adjustTarget = breakdown.find(c => c.component_code === 'SPECIAL_ALLOWANCE')
            || breakdown.find(c => c.calculation_type === 'REMAINING' && c.component_type === 'EARNING')
            || [...breakdown].reverse().find(c => c.component_type === 'EARNING');

        if (adjustTarget) {
            adjustTarget.annual_amount = Math.round((adjustTarget.annual_amount + roundingDiff) * 100) / 100;
            adjustTarget.monthly_amount = Math.round((adjustTarget.annual_amount / 12) * 100) / 100;
        }
    }

    return {
        annual_ctc: annualCTC,
        monthly_ctc: Math.round((annualCTC / 12) * 100) / 100,
        gross_earnings: Math.round(grossEarnings * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        employer_contributions: Math.round(employerContributions * 100) / 100,
        net_salary: Math.round((grossEarnings - totalDeductions) * 100) / 100,
        monthly_net: Math.round(((grossEarnings - totalDeductions) / 12) * 100) / 100,
        breakdown
    };
};

// =====================================================
// EMPLOYEE SALARY ASSIGNMENT
// =====================================================

exports.assignEmployeeSalary = async (tenantId, employeeId, data, userId, existingClient = null) => {
    const client = existingClient || await db.connect();
    const isNewClient = !existingClient;

    try {
        if (isNewClient) await client.query('BEGIN');

        // Mark previous assignments as not current
        await client.query(
            `UPDATE employee_salary_assignments 
             SET is_current = FALSE, effective_to = $3, updated_at = NOW()
             WHERE employee_id = $1 AND tenant_id = $2 AND is_current = TRUE`,
            [employeeId, tenantId, data.effective_from]
        );

        // Calculate breakdown
        const breakdown = await exports.calculateCTCBreakdown(tenantId, data.structure_id, data.annual_ctc);

        // Create new assignment
        const assignmentResult = await client.query(
            `INSERT INTO employee_salary_assignments 
             (tenant_id, employee_id, structure_id, annual_ctc, effective_from, revision_reason, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [tenantId, employeeId, data.structure_id, data.annual_ctc, data.effective_from, data.revision_reason, userId]
        );

        const assignment = assignmentResult.rows[0];

        // Save component values
        for (const comp of breakdown.breakdown) {
            await client.query(
                `INSERT INTO employee_salary_component_values 
                 (tenant_id, assignment_id, component_id, monthly_amount, annual_amount)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tenantId, assignment.id, comp.component_id, comp.monthly_amount, comp.annual_amount]
            );
        }

        if (isNewClient) await client.query('COMMIT');

        // Trigger retroactive arrears calculation (Async)
        // We do this after commit so it can see the new assignment
        // and doesn't block the main flow if it fails
        try {
            const updatedAssignment = {
                ...assignment,
                summary: {
                    monthly_net: breakdown.monthly_net
                }
            };
            await arrearsService.calculateRetroactiveArrears(tenantId, employeeId, updatedAssignment, userId);
        } catch (arrearError) {
            console.error('[assignEmployeeSalary] Arrears calculation failed:', arrearError);
        }

        return {
            ...assignment,
            breakdown: breakdown.breakdown,
            summary: {
                gross_earnings: breakdown.gross_earnings,
                total_deductions: breakdown.total_deductions,
                net_salary: breakdown.net_salary,
                monthly_net: breakdown.monthly_net
            }
        };
    } catch (err) {
        if (isNewClient) await client.query('ROLLBACK');
        throw err;
    } finally {
        if (isNewClient) client.release();
    }
};

exports.getEmployeeSalary = async (tenantId, employeeId) => {
    const assignmentResult = await db.query(
        `SELECT esa.*, ss.name as structure_name
         FROM employee_salary_assignments esa
         LEFT JOIN salary_structures ss ON ss.id = esa.structure_id
         WHERE esa.employee_id = $1 AND esa.tenant_id = $2 AND esa.is_current = TRUE`,
        [employeeId, tenantId]
    );

    if (!assignmentResult.rows[0]) return null;

    const assignment = assignmentResult.rows[0];

    const componentsResult = await db.query(
        `SELECT escv.*, sc.name as component_name, sc.code as component_code, 
                sc.component_type, sc.category, sc.is_taxable
         FROM employee_salary_component_values escv
         JOIN salary_components sc ON sc.id = escv.component_id
         WHERE escv.assignment_id = $1
         ORDER BY sc.display_order`,
        [assignment.id]
    );

    // Calculate summary
    let grossEarnings = 0;
    let totalDeductions = 0;

    for (const comp of componentsResult.rows) {
        if (comp.component_type === 'EARNING' || comp.component_type === 'REIMBURSEMENT') {
            grossEarnings += parseFloat(comp.monthly_amount);
        } else if (comp.component_type === 'DEDUCTION') {
            totalDeductions += parseFloat(comp.monthly_amount);
        }
    }

    return {
        ...assignment,
        components: componentsResult.rows,
        summary: {
            monthly_gross: Math.round(grossEarnings * 100) / 100,
            monthly_deductions: Math.round(totalDeductions * 100) / 100,
            monthly_net: Math.round((grossEarnings - totalDeductions) * 100) / 100
        }
    };
};

exports.ensureEmployeeAssignments = async (tenantId, userId) => {
    const defaultStructureRes = await db.query(
        `SELECT id FROM salary_structures WHERE tenant_id = $1 AND is_default = TRUE AND is_active = TRUE LIMIT 1`,
        [tenantId]
    );
    const defaultStructureId = defaultStructureRes.rows[0]?.id;

    if (!defaultStructureId) return { count: 0, message: 'No default structure found' };

    const missingAssignments = await db.query(
        `SELECT e.id, esd.ctc, e.join_date
         FROM employees e
         JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = TRUE
         LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
         WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.is_deleted = FALSE AND esa.id IS NULL AND esd.ctc > 0`,
        [tenantId]
    );

    let count = 0;
    for (const emp of missingAssignments.rows) {
        try {
            await exports.assignEmployeeSalary(tenantId, emp.id, {
                structure_id: defaultStructureId,
                annual_ctc: parseFloat(emp.ctc),
                effective_from: emp.join_date || new Date().toISOString().split('T')[0],
                revision_reason: 'Bulk auto-assignment'
            }, userId);
            count++;
        } catch (err) {
            console.error(`[ensureEmployeeAssignments] Failed for employee ${emp.id}:`, err);
        }
    }

    return { count, message: `Auto-assigned structures to ${count} employees` };
};

exports.migrateEmployeesToStructure = async (tenantId, structureId, userId) => {
    // Check if structure exists and is active
    const structureRes = await db.query(
        `SELECT * FROM salary_structures WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
        [structureId, tenantId]
    );
    if (!structureRes.rows[0]) throw new Error('Structure not found or inactive');
    const structure = structureRes.rows[0];

    // Find all active employees with valid CTC
    // We prioritize current assignment CTC, then legacy details CTC
    const employeesRes = await db.query(
        `SELECT e.id, 
                COALESCE(esa.annual_ctc, esd.ctc) as ctc
         FROM employees e
         LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
         LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = TRUE
         WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.is_deleted = FALSE
           AND (esa.annual_ctc > 0 OR esd.ctc > 0)`,
        [tenantId]
    );

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const emp of employeesRes.rows) {
        try {
            const ctc = parseFloat(emp.ctc);
            if (!ctc || ctc <= 0) continue;

            await exports.assignEmployeeSalary(
                tenantId,
                emp.id,
                {
                    structure_id: structureId,
                    annual_ctc: ctc,
                    effective_from: new Date().toISOString().split('T')[0], // Today
                    revision_reason: `Bulk Migration to ${structure.name}`
                },
                userId
            );
            successCount++;
        } catch (err) {
            console.error(`[MigrateStructure] Failed for employee ${emp.id}:`, err);
            failCount++;
            errors.push({ employeeId: emp.id, error: err.message });
        }
    }

    return {
        successCount,
        failCount,
        total: employeesRes.rowCount,
        message: `Successfully migrated ${successCount} employees to ${structure.name}. Failed: ${failCount}`
    };
};

exports.getEmployeeSalaryHistory = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT esa.*, ss.name as structure_name, u.email as created_by_email
         FROM employee_salary_assignments esa
         LEFT JOIN salary_structures ss ON ss.id = esa.structure_id
         LEFT JOIN users u ON u.id = esa.created_by
         WHERE esa.employee_id = $1 AND esa.tenant_id = $2
         ORDER BY esa.effective_from DESC`,
        [employeeId, tenantId]
    );

    return result.rows;
};

// =====================================================
// SEED DEFAULT DATA
// =====================================================

exports.seedDefaultComponents = async (tenantId) => {
    await db.query(`SELECT seed_default_salary_components($1)`, [tenantId]);
};

exports.seedDefaultReimbursementTypes = async (tenantId) => {
    await db.query(`SELECT seed_default_reimbursement_types($1)`, [tenantId]);
};

exports.seedDefaultStructure = async (tenantId) => {
    const result = await db.query(`SELECT seed_default_salary_structure($1) as structure_id`, [tenantId]);
    return result.rows[0]?.structure_id;
};

exports.seedIndianStructure = async (tenantId) => {
    const result = await db.query(`SELECT seed_indian_salary_structure($1) as structure_id`, [tenantId]);
    return result.rows[0]?.structure_id;
};

// =====================================================
// SALARY STRUCTURE TEMPLATES
// =====================================================

const TEMPLATES = [
    {
        id: 'indian-standard-ctc',
        name: 'Indian Standard CTC Structure',
        description: 'India-compliant CTC structure as per Wage Code 2019, Provident Fund Act, ESI Act, and Payment of Gratuity Act',
        country: 'India',
        tags: ['india', 'ctc', 'statutory', 'compliant'],
        components: [
            { code: 'BASIC', name: 'Basic Salary', calculation_type: 'PERCENTAGE_OF_CTC', percentage: 40, description: '40% of CTC (Wage Code 2019 minimum)' },
            { code: 'HRA', name: 'House Rent Allowance', calculation_type: 'PERCENTAGE_OF_BASIC', percentage: 50, description: '50% of Basic (metro) / 40% (non-metro)' },
            { code: 'DA', name: 'Dearness Allowance', calculation_type: 'PERCENTAGE_OF_BASIC', percentage: 5, description: '5% of Basic' },
            { code: 'CONVEYANCE', name: 'Conveyance Allowance', calculation_type: 'FIXED', fixed_amount: 1600, description: '₹1,600/month (standard)' },
            { code: 'MEDICAL', name: 'Medical Allowance', calculation_type: 'FIXED', fixed_amount: 1250, description: '₹1,250/month (standard)' },
            { code: 'PF_EE', name: 'Provident Fund (Employee)', calculation_type: 'PERCENTAGE_OF_BASIC', percentage: 12, max_value: 1800, description: '12% of Basic (capped at ₹15,000 Basic)' },
            { code: 'PF_ER', name: 'Provident Fund (Employer)', calculation_type: 'PERCENTAGE_OF_BASIC', percentage: 12, max_value: 1800, description: '12% of Basic (capped at ₹15,000 Basic)' },
            { code: 'GRATUITY', name: 'Gratuity', calculation_type: 'PERCENTAGE_OF_BASIC', percentage: 4.81, description: '4.81% of Basic (Payment of Gratuity Act)' },
            { code: 'SPECIAL', name: 'Special Allowance', calculation_type: 'REMAINING', description: 'Balancing figure to complete CTC' }
        ]
    }
];

exports.listTemplates = () => {
    return TEMPLATES;
};

exports.createStructureFromTemplate = async (tenantId, userId, templateId) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        throw new Error(`Template '${templateId}' not found`);
    }

    // Ensure default components exist first
    await exports.seedDefaultComponents(tenantId);

    // Fetch tenant's components to map template codes to IDs
    const componentsResult = await db.query(
        `SELECT id, code FROM salary_components WHERE tenant_id = $1 AND is_active = TRUE`,
        [tenantId]
    );
    const codeToId = {};
    for (const row of componentsResult.rows) {
        codeToId[row.code] = row.id;
    }

    // Map template components to component IDs
    const mappedComponents = [];
    for (let i = 0; i < template.components.length; i++) {
        const tc = template.components[i];
        const componentId = codeToId[tc.code];
        if (!componentId) {
            console.warn(`Template component code '${tc.code}' not found in tenant's components, skipping`);
            continue;
        }
        mappedComponents.push({
            component_id: componentId,
            calculation_type: tc.calculation_type,
            percentage: tc.percentage,
            fixed_amount: tc.fixed_amount,
            max_value: tc.max_value,
            display_order: i + 1
        });
    }

    // Create structure using existing function
    const structureData = {
        name: template.name,
        description: template.description,
        is_default: false,
        is_active: true,
        components: mappedComponents
    };

    return await exports.createSalaryStructure(tenantId, userId, structureData);
};
