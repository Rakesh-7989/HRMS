const db = require('../../../config/db');

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

            console.log(`[updateSalaryStructure] Refreshing ${assignments.rowCount} employee assignments for structure ${structureId}`);

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
                // TODO: Implement formula parser
                break;
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

    // Third pass: Calculate REMAINING component (e.g., Special Allowance)
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

exports.assignEmployeeSalary = async (tenantId, employeeId, data, userId) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

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

        await client.query('COMMIT');

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
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
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
