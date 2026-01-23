const db = require("../../../config/db");

// ===================================================================
// STATUTORY CONFIGURATION
// ===================================================================

const getStatutoryConfig = async (tenantId) => {
    const result = await db.query(
        `SELECT * FROM statutory_config WHERE tenant_id = $1`,
        [tenantId]
    );
    return result.rows[0];
};

const upsertStatutoryConfig = async (tenantId, userId, payload) => {
    const existing = await getStatutoryConfig(tenantId);

    if (existing) {
        // Update
        const fields = [];
        const values = [];
        let idx = 1;

        const columnMap = {
            pfEnabled: 'pf_enabled',
            pfEmployerRate: 'pf_employer_rate',
            pfEmployeeRate: 'pf_employee_rate',
            pfWageCeiling: 'pf_wage_ceiling',
            pfAdminCharges: 'pf_admin_charges',
            pfEstablishmentCode: 'pf_establishment_code',
            esiEnabled: 'esi_enabled',
            esiEmployerRate: 'esi_employer_rate',
            esiEmployeeRate: 'esi_employee_rate',
            esiWageCeiling: 'esi_wage_ceiling',
            esiEstablishmentCode: 'esi_establishment_code',
            ptEnabled: 'pt_enabled',
            ptState: 'pt_state',
            lwfEnabled: 'lwf_enabled',
            lwfEmployerAmount: 'lwf_employer_amount',
            lwfEmployeeAmount: 'lwf_employee_amount',
            tdsEnabled: 'tds_enabled'
        };

        for (const key of Object.keys(payload)) {
            if (columnMap[key]) {
                fields.push(`${columnMap[key]} = $${idx++}`);
                values.push(payload[key]);
            }
        }

        if (fields.length === 0) return existing;

        fields.push(`updated_at = now()`);
        values.push(tenantId);

        const result = await db.query(
            `UPDATE statutory_config SET ${fields.join(', ')}
       WHERE tenant_id = $${idx}
       RETURNING *`,
            values
        );

        return result.rows[0];
    } else {
        // Insert
        const result = await db.query(
            `INSERT INTO statutory_config (
        tenant_id, pf_enabled, pf_employer_rate, pf_employee_rate, pf_wage_ceiling,
        esi_enabled, esi_employer_rate, esi_employee_rate, esi_wage_ceiling,
        pt_enabled, pt_state, lwf_enabled, tds_enabled
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
            [
                tenantId,
                payload.pfEnabled ?? true, payload.pfEmployerRate ?? 12, payload.pfEmployeeRate ?? 12, payload.pfWageCeiling ?? 15000,
                payload.esiEnabled ?? true, payload.esiEmployerRate ?? 3.25, payload.esiEmployeeRate ?? 0.75, payload.esiWageCeiling ?? 21000,
                payload.ptEnabled ?? true, payload.ptState || null, payload.lwfEnabled ?? false, payload.tdsEnabled ?? true
            ]
        );

        return result.rows[0];
    }
};

// ===================================================================
// PROFESSIONAL TAX SLABS
// ===================================================================

const getPTSlabs = async (tenantId, state = null) => {
    let query = `SELECT * FROM pt_slabs WHERE tenant_id = $1`;
    const params = [tenantId];

    if (state) {
        query += ` AND state = $2`;
        params.push(state);
    }

    query += ` ORDER BY min_salary ASC`;

    const result = await db.query(query, params);
    return result.rows;
};

const createPTSlab = async (tenantId, payload) => {
    const { state, minSalary, maxSalary, monthlyTax, gender, effectiveFrom } = payload;

    const result = await db.query(
        `INSERT INTO pt_slabs (tenant_id, state, min_salary, max_salary, monthly_tax, gender, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [tenantId, state, minSalary, maxSalary || null, monthlyTax, gender || 'ALL', effectiveFrom || null]
    );

    return result.rows[0];
};

const deletePTSlab = async (tenantId, slabId) => {
    await db.query(
        `DELETE FROM pt_slabs WHERE tenant_id = $1 AND id = $2`,
        [tenantId, slabId]
    );
    return { deleted: true };
};

// Calculate PT for an employee
const calculatePT = async (tenantId, grossSalary, state, gender = 'ALL') => {
    const result = await db.query(
        `SELECT monthly_tax FROM pt_slabs 
     WHERE tenant_id = $1 AND state = $2 
       AND (gender = $3 OR gender = 'ALL')
       AND min_salary <= $4 
       AND (max_salary IS NULL OR max_salary >= $4)
     ORDER BY min_salary DESC
     LIMIT 1`,
        [tenantId, state, gender, grossSalary]
    );

    return result.rows[0]?.monthly_tax || 0;
};

// ===================================================================
// DEDUCTION TYPES
// ===================================================================

const createDeductionType = async (tenantId, payload) => {
    const {
        name, code, description, category,
        isStatutory, isTaxable, isRecurring,
        calculationType, defaultValue, percentageOf
    } = payload;

    const result = await db.query(
        `INSERT INTO deduction_types (
      tenant_id, name, code, description, category,
      is_statutory, is_taxable, is_recurring,
      calculation_type, default_value, percentage_of
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [
            tenantId, name, code, description || null, category,
            isStatutory || false, isTaxable || false, isRecurring || false,
            calculationType || 'FIXED', defaultValue || null, percentageOf || null
        ]
    );

    return result.rows[0];
};

const getDeductionTypes = async (tenantId) => {
    const result = await db.query(
        `SELECT * FROM deduction_types WHERE tenant_id = $1 AND is_active = TRUE ORDER BY category, name`,
        [tenantId]
    );
    return result.rows;
};

const updateDeductionType = async (tenantId, typeId, payload) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMap = {
        name: 'name',
        code: 'code',
        description: 'description',
        category: 'category',
        isStatutory: 'is_statutory',
        isTaxable: 'is_taxable',
        isRecurring: 'is_recurring',
        calculationType: 'calculation_type',
        defaultValue: 'default_value',
        percentageOf: 'percentage_of',
        isActive: 'is_active'
    };

    for (const key of Object.keys(payload)) {
        if (columnMap[key]) {
            fields.push(`${columnMap[key]} = $${idx++}`);
            values.push(payload[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(tenantId, typeId);

    const result = await db.query(
        `UPDATE deduction_types SET ${fields.join(', ')}
     WHERE tenant_id = $${idx++} AND id = $${idx}
     RETURNING *`,
        values
    );

    return result.rows[0];
};

// ===================================================================
// EMPLOYEE DEDUCTIONS
// ===================================================================

const addEmployeeDeduction = async (tenantId, userId, payload) => {
    const { employeeId, deductionTypeId, amount, effectiveFrom, effectiveTo, remarks } = payload;

    const result = await db.query(
        `INSERT INTO employee_deductions (
      tenant_id, employee_id, deduction_type_id, amount, effective_from, effective_to, remarks, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
        [tenantId, employeeId, deductionTypeId, amount, effectiveFrom, effectiveTo || null, remarks || null, userId]
    );

    return result.rows[0];
};

const getEmployeeDeductions = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT ed.*, dt.name as deduction_name, dt.category, dt.code
     FROM employee_deductions ed
     JOIN deduction_types dt ON dt.id = ed.deduction_type_id
     WHERE ed.tenant_id = $1 AND ed.employee_id = $2 AND ed.is_active = TRUE
     ORDER BY ed.effective_from DESC`,
        [tenantId, employeeId]
    );
    return result.rows;
};

const removeEmployeeDeduction = async (tenantId, deductionId) => {
    const result = await db.query(
        `UPDATE employee_deductions SET is_active = FALSE WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
        [tenantId, deductionId]
    );
    return result.rows[0];
};

// ===================================================================
// COST CENTRES
// ===================================================================

const createCostCentre = async (tenantId, userId, payload) => {
    const { name, code, description, budgetAllocated, departmentId } = payload;

    const result = await db.query(
        `INSERT INTO cost_centres (tenant_id, name, code, description, budget_allocated, department_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [tenantId, name, code || null, description || null, budgetAllocated || 0, departmentId || null, userId]
    );

    return result.rows[0];
};

const getCostCentres = async (tenantId) => {
    const result = await db.query(
        `SELECT cc.*, d.name as department_name
     FROM cost_centres cc
     LEFT JOIN departments d ON d.id = cc.department_id
     WHERE cc.tenant_id = $1 AND cc.is_active = TRUE
     ORDER BY cc.name`,
        [tenantId]
    );
    return result.rows;
};

const updateCostCentre = async (tenantId, costCentreId, payload) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMap = {
        name: 'name',
        code: 'code',
        description: 'description',
        budgetAllocated: 'budget_allocated',
        budgetUtilized: 'budget_utilized',
        departmentId: 'department_id',
        isActive: 'is_active'
    };

    for (const key of Object.keys(payload)) {
        if (columnMap[key]) {
            fields.push(`${columnMap[key]} = $${idx++}`);
            values.push(payload[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = now()`);
    values.push(tenantId, costCentreId);

    const result = await db.query(
        `UPDATE cost_centres SET ${fields.join(', ')}
     WHERE tenant_id = $${idx++} AND id = $${idx}
     RETURNING *`,
        values
    );

    return result.rows[0];
};

const deleteCostCentre = async (tenantId, costCentreId) => {
    const result = await db.query(
        `UPDATE cost_centres SET is_active = FALSE, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
        [tenantId, costCentreId]
    );
    return result.rows[0];
};

module.exports = {
    // Statutory Config
    getStatutoryConfig,
    upsertStatutoryConfig,

    // PT Slabs
    getPTSlabs,
    createPTSlab,
    deletePTSlab,
    calculatePT,

    // Deduction Types
    createDeductionType,
    getDeductionTypes,
    updateDeductionType,

    // Employee Deductions
    addEmployeeDeduction,
    getEmployeeDeductions,
    removeEmployeeDeduction,

    // Cost Centres
    createCostCentre,
    getCostCentres,
    updateCostCentre,
    deleteCostCentre
};
