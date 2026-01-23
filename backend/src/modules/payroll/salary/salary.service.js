const db = require("../../../config/db");

// ===================================================================
// SALARY TEMPLATES
// ===================================================================

const createTemplate = async (tenantId, userId, payload) => {
    const {
        name, code, description,
        basicPercentage, hraPercentage, daPercentage,
        specialAllowancePercentage, otherAllowancePercentage,
        isDefault
    } = payload;

    // Validate that percentages sum to 100%
    const basicPct = basicPercentage || 40;
    const hraPct = hraPercentage || 20;
    const daPct = daPercentage || 10;
    const specialPct = specialAllowancePercentage || 20;
    const otherPct = otherAllowancePercentage || 10;

    const total = basicPct + hraPct + daPct + specialPct + otherPct;
    if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Component percentages must sum to 100%. Current total: ${total}%`);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
        await db.query(
            `UPDATE salary_templates SET is_default = FALSE WHERE tenant_id = $1`,
            [tenantId]
        );
    }

    const result = await db.query(
        `INSERT INTO salary_templates (
      tenant_id, name, code, description,
      basic_percentage, hra_percentage, da_percentage,
      special_allowance_percentage, other_allowance_percentage,
      is_default, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [
            tenantId, name, code || null, description || null,
            basicPercentage || 40, hraPercentage || 20, daPercentage || 10,
            specialAllowancePercentage || 20, otherAllowancePercentage || 10,
            isDefault || false, userId
        ]
    );

    return result.rows[0];
};

const getTemplates = async (tenantId) => {
    const result = await db.query(
        `SELECT * FROM salary_templates 
     WHERE tenant_id = $1 AND is_active = TRUE 
     ORDER BY is_default DESC, created_at DESC`,
        [tenantId]
    );
    return result.rows;
};

const getTemplateById = async (tenantId, templateId) => {
    const result = await db.query(
        `SELECT * FROM salary_templates WHERE tenant_id = $1 AND id = $2`,
        [tenantId, templateId]
    );
    return result.rows[0];
};

const updateTemplate = async (tenantId, templateId, payload) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMap = {
        name: 'name',
        code: 'code',
        description: 'description',
        basicPercentage: 'basic_percentage',
        hraPercentage: 'hra_percentage',
        daPercentage: 'da_percentage',
        specialAllowancePercentage: 'special_allowance_percentage',
        otherAllowancePercentage: 'other_allowance_percentage',
        isDefault: 'is_default',
        isActive: 'is_active'
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

    // Handle is_default unset
    if (payload.isDefault) {
        await db.query(
            `UPDATE salary_templates SET is_default = FALSE WHERE tenant_id = $1`,
            [tenantId]
        );
    }

    fields.push(`updated_at = now()`);
    values.push(tenantId, templateId);

    const result = await db.query(
        `UPDATE salary_templates SET ${fields.join(', ')}
     WHERE tenant_id = $${idx++} AND id = $${idx}
     RETURNING *`,
        values
    );

    return result.rows[0];
};

const deleteTemplate = async (tenantId, templateId) => {
    const result = await db.query(
        `UPDATE salary_templates SET is_active = FALSE, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
        [tenantId, templateId]
    );
    return result.rows[0];
};

// ===================================================================
// EMPLOYEE SALARY DETAILS
// ===================================================================

const assignSalary = async (tenantId, userId, payload) => {
    const {
        employeeId, templateId, ctc, effectiveFrom, effectiveTo,
        bankName, bankAccountNumber, bankIfsc
    } = payload;

    // Deactivate previous current salary
    await db.query(
        `UPDATE employee_salary_details 
     SET is_current = FALSE, effective_to = $1, updated_at = now()
     WHERE tenant_id = $2 AND employee_id = $3 AND is_current = TRUE`,
        [effectiveFrom, tenantId, employeeId]
    );

    // Get template for percentage calculations
    let template = null;
    if (templateId) {
        template = await getTemplateById(tenantId, templateId);
    }

    const basicPct = template?.basic_percentage || 40;
    const hraPct = template?.hra_percentage || 20;
    const daPct = template?.da_percentage || 10;
    const specialPct = template?.special_allowance_percentage || 20;
    const otherPct = template?.other_allowance_percentage || 10;

    const basic = (ctc * basicPct) / 100;
    const hra = (ctc * hraPct) / 100;
    const da = (ctc * daPct) / 100;
    const specialAllowance = (ctc * specialPct) / 100;
    const otherAllowance = (ctc * otherPct) / 100;
    const perDaySalary = ctc / 12 / 30; // Monthly / 30 days

    const result = await db.query(
        `INSERT INTO employee_salary_details (
      tenant_id, employee_id, template_id, ctc,
      basic, hra, da, special_allowance, other_allowance,
      per_day_salary, bank_name, bank_account_number, bank_ifsc,
      effective_from, effective_to, is_current, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, $16)
    RETURNING *`,
        [
            tenantId, employeeId, templateId || null, ctc,
            basic, hra, da, specialAllowance, otherAllowance,
            perDaySalary, bankName || null, bankAccountNumber || null, bankIfsc || null,
            effectiveFrom, effectiveTo || null, userId
        ]
    );

    return result.rows[0];
};

const getEmployeeSalary = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT esd.*, st.name as template_name
     FROM employee_salary_details esd
     LEFT JOIN salary_templates st ON st.id = esd.template_id
     WHERE esd.tenant_id = $1 AND esd.employee_id = $2 AND esd.is_current = TRUE`,
        [tenantId, employeeId]
    );
    return result.rows[0];
};

const getEmployeeSalaryHistory = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT esd.*, st.name as template_name
     FROM employee_salary_details esd
     LEFT JOIN salary_templates st ON st.id = esd.template_id
     WHERE esd.tenant_id = $1 AND esd.employee_id = $2
     ORDER BY esd.effective_from DESC`,
        [tenantId, employeeId]
    );
    return result.rows;
};

const getAllEmployeeSalaries = async (tenantId) => {
    const result = await db.query(
        `SELECT esd.*, e.first_name, e.last_name, e.employee_id as emp_code, st.name as template_name
     FROM employee_salary_details esd
     JOIN employees e ON e.id = esd.employee_id
     LEFT JOIN salary_templates st ON st.id = esd.template_id
     WHERE esd.tenant_id = $1 AND esd.is_current = TRUE
     ORDER BY e.first_name, e.last_name`,
        [tenantId]
    );
    return result.rows;
};

// ===================================================================
// SALARY REVISIONS
// ===================================================================

const createRevision = async (tenantId, userId, payload) => {
    const {
        employeeId, newCtc, oldCtc, revisionType, effectiveFrom, remarks
    } = payload;

    const incrementAmount = newCtc - (oldCtc || 0);
    const incrementPercentage = oldCtc ? ((incrementAmount / oldCtc) * 100) : 100;

    const result = await db.query(
        `INSERT INTO salary_revisions (
      tenant_id, employee_id, old_ctc, new_ctc,
      increment_amount, increment_percentage, revision_type,
      effective_from, remarks, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
        [
            tenantId, employeeId, oldCtc || 0, newCtc,
            incrementAmount, incrementPercentage.toFixed(2), revisionType,
            effectiveFrom, remarks || null, userId
        ]
    );

    return result.rows[0];
};

const getRevisions = async (tenantId, employeeId = null) => {
    let query = `
    SELECT sr.*, e.first_name, e.last_name, e.employee_id as emp_code
    FROM salary_revisions sr
    JOIN employees e ON e.id = sr.employee_id
    WHERE sr.tenant_id = $1
  `;
    const params = [tenantId];

    if (employeeId) {
        query += ` AND sr.employee_id = $2`;
        params.push(employeeId);
    }

    query += ` ORDER BY sr.effective_from DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

const approveRevision = async (tenantId, revisionId, userId, status) => {
    const result = await db.query(
        `UPDATE salary_revisions
     SET status = $1, approved_by = $2, approved_at = now()
     WHERE tenant_id = $3 AND id = $4 AND status = 'PENDING'
     RETURNING *`,
        [status, userId, tenantId, revisionId]
    );

    if (result.rowCount === 0) {
        throw new Error('Revision not found or already processed');
    }

    // If approved, apply the salary change
    if (status === 'APPROVED') {
        const revision = result.rows[0];
        await assignSalary(tenantId, userId, {
            employeeId: revision.employee_id,
            ctc: revision.new_ctc,
            effectiveFrom: revision.effective_from
        });
    }

    return result.rows[0];
};

module.exports = {
    // Templates
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,

    // Employee Salary
    assignSalary,
    getEmployeeSalary,
    getEmployeeSalaryHistory,
    getAllEmployeeSalaries,

    // Revisions
    createRevision,
    getRevisions,
    approveRevision
};
