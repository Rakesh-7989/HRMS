const db = require("../../../config/db");
const statutoryCalculator = require("../utils/statutoryCalculator");
const { calculateAge } = require("../payrun/payrun.service"); // Reuse age helper

// ===================================================================
// TAX SECTIONS & CONFIGURATION
// ===================================================================

const getTaxSections = async (tenantId) => {
    // Auto-seed if empty (for new tenants)
    const existing = await db.query(
        `SELECT COUNT(*) FROM tax_sections WHERE tenant_id = $1`,
        [tenantId]
    );

    if (parseInt(existing.rows[0].count) === 0) {
        await seedDefaultSections(tenantId);
    }

    const result = await db.query(
        `SELECT * FROM tax_sections WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name`,
        [tenantId]
    );
    return result.rows;
};

const seedDefaultSections = async (tenantId) => {
    const defaults = [
        { name: "80C - LIC/PPF/Tuition Fees", section: "80C", max_limit: 150000, description: "Life Insurance, PPF, EPF, Tuition Fees, etc." },
        { name: "80D - Medical Insurance (Self)", section: "80D", max_limit: 25000, description: "Health insurance for self and family" },
        { name: "80D - Medical Insurance (Parents)", section: "80D", max_limit: 25000, description: "Health insurance for parents" },
        { name: "80D - Medical Insurance (Senior Parents)", section: "80D", max_limit: 50000, description: "Health insurance for senior citizen parents" },
        { name: "HRA - House Rent Allowance", section: "HRA", max_limit: null, description: "Rent paid receipts" },
        { name: "80E - Education Loan Interest", section: "80E", max_limit: null, description: "Interest on higher education loan" },
        { name: "80G - Donations", section: "80G", max_limit: null, description: "Donations to charitable funds" }
    ];

    for (const section of defaults) {
        await db.query(
            `INSERT INTO tax_sections (tenant_id, name, section, max_limit, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, section.name, section.section, section.max_limit, section.description]
        );
    }
};

const createTaxSection = async (tenantId, userId, payload) => {
    const { name, section, maxLimit, description, regimeAllowed } = payload;
    const result = await db.query(
        `INSERT INTO tax_sections (tenant_id, name, section, max_limit, description, regime_allowed)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, name, section, maxLimit, description, regimeAllowed || 'BOTH']
    );
    return result.rows[0];
};

// ===================================================================
// REGIME SELECTION
// ===================================================================

const getRegime = async (tenantId, employeeId, fy) => {
    const result = await db.query(
        `SELECT * FROM employee_tax_regimes 
         WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3`,
        [tenantId, employeeId, fy]
    );

    // Default to NULL if not set (Frontend should handle "Not Selected" state or default to NEW)
    return result.rows[0] || { regime: null, is_frozen: false };
};

const setRegime = async (tenantId, employeeId, fy, regime) => {
    if (!employeeId) {
        throw new Error("Tax regime can only be set for users with an active employee profile.");
    }

    try {
        // Check if frozen
        const existing = await getRegime(tenantId, employeeId, fy);
        if (existing.is_frozen) {
            throw new Error("Tax regime selection is frozen for this financial year.");
        }

        const previousRegime = existing.regime;

        const result = await db.query(
            `INSERT INTO employee_tax_regimes (tenant_id, employee_id, financial_year, regime)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (employee_id, financial_year) 
             DO UPDATE SET regime = $4, updated_at = NOW()
             RETURNING *`,
            [tenantId, employeeId, fy, regime]
        );

        // When switching from OLD to NEW, clear all OLD-regime-only declarations
        if (previousRegime === 'OLD' && regime === 'NEW') {
            const oldOnlySections = await db.query(
                `SELECT id FROM tax_sections 
                 WHERE tenant_id = $1 AND regime_allowed = 'OLD'`,
                [tenantId]
            );
            const sectionIds = oldOnlySections.rows.map(s => s.id);
            if (sectionIds.length > 0) {
                await db.query(
                    `UPDATE it_declarations 
                     SET declared_amount = 0, status = 'CLEARED_ON_REGIME_SWITCH', updated_at = NOW()
                     WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3
                       AND section_id = ANY($4::uuid[])`,
                    [tenantId, employeeId, fy, sectionIds]
                );
            }
        }

        return result.rows[0];
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[taxService.setRegime] DB Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            employeeId,
            fy,
            regime
        });
        throw error;
    }
};

const freezeRegime = async (tenantId, employeeId, fy, userId) => {
    const result = await db.query(
        `UPDATE employee_tax_regimes 
         SET is_frozen = TRUE, frozen_at = NOW(), frozen_by = $4
         WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3
         RETURNING *`,
        [tenantId, employeeId, fy, userId]
    );
    return result.rows[0];
};

// ===================================================================
// IT DECLARATIONS
// ===================================================================

const getDeclarations = async (tenantId, employeeId, fy) => {
    const result = await db.query(
        `SELECT d.*, s.name as section_name, s.section as section_code, s.max_limit
         FROM it_declarations d
         JOIN tax_sections s ON s.id = d.section_id
         WHERE d.tenant_id = $1 AND d.employee_id = $2 AND d.financial_year = $3
         ORDER BY s.section, s.name`,
        [tenantId, employeeId, fy]
    );
    return result.rows;
};

const upsertDeclaration = async (tenantId, employeeId, userId, payload) => {
    if (!employeeId) {
        throw new Error("Tax declarations can only be submitted for users with an active employee profile.");
    }
    const { financialYear, sectionId, declaredAmount, proofUrl } = payload;

    // Check if tax declaration window is frozen for this FY
    const regimeInfo = await getRegime(tenantId, employeeId, financialYear);
    if (regimeInfo.is_frozen) {
        throw new Error('Tax declaration window has been closed for this financial year. No further changes are allowed.');
    }


    // Correction: Upsert based on ID if present, else Insert.
    if (payload.id) {
        const updateRes = await db.query(
            `UPDATE it_declarations 
             SET declared_amount = $1, proof_url = COALESCE($2, proof_url), 
                 updated_at = NOW(), status = 'PENDING' -- Reset status on edit
             WHERE tenant_id = $3 AND id = $4 AND employee_id = $5
             RETURNING *`,
            [declaredAmount, proofUrl, tenantId, payload.id, employeeId]
        );
        return updateRes.rows[0];
    } else {
        const insertRes = await db.query(
            `INSERT INTO it_declarations (
                tenant_id, employee_id, financial_year, section_id, 
                declared_amount, proof_url, status, created_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)
             ON CONFLICT (employee_id, financial_year, section_id)
             DO UPDATE SET 
                declared_amount = EXCLUDED.declared_amount,
                proof_url = COALESCE(EXCLUDED.proof_url, it_declarations.proof_url),
                status = 'PENDING',
                updated_at = NOW()
             RETURNING *`,
            [tenantId, employeeId, financialYear, sectionId, declaredAmount, proofUrl, userId]
        );
        return insertRes.rows[0];
    }
};

const deleteDeclaration = async (tenantId, declarationId, employeeId) => {
    await db.query(
        `DELETE FROM it_declarations WHERE tenant_id = $1 AND id = $2 AND employee_id = $3`,
        [tenantId, declarationId, employeeId]
    );
    return { deleted: true };
};

const adminReviewDeclaration = async (tenantId, declarationId, userId, payload) => {
    const { status, approvedAmount, remarks } = payload; // status: APPROVED, REJECTED

    const result = await db.query(
        `UPDATE it_declarations 
         SET status = $1, approved_amount = $2, remarks = $3, 
             approved_by = $4, approved_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $5 AND id = $6
         RETURNING *`,
        [status, approvedAmount, remarks, userId, tenantId, declarationId]
    );
    return result.rows[0];
};

const getAdminReviewList = async (tenantId, fy, status = null) => {
    let query = `
        SELECT d.*, e.first_name, e.last_name, e.employee_id as emp_code,
               s.name as section_name, s.section as section_code
        FROM it_declarations d
        JOIN employees e ON e.id = d.employee_id
        JOIN tax_sections s ON s.id = d.section_id
        WHERE d.tenant_id = $1 AND d.financial_year = $2
    `;
    const params = [tenantId, fy];

    if (status) {
        query += ` AND d.status = $3`;
        params.push(status);
    }

    query += ` ORDER BY e.first_name, s.section`;

    const result = await db.query(query, params);
    return result.rows;
};

/**
 * Calculate projected TDS for an employee based on current declarations
 * Used for real-time UI updates
 */
const calculateProjectedTDS = async (tenantId, employeeId, fy) => {
    // 1. Get Employee Details
    const empRes = await db.query(
        `SELECT e.date_of_birth, e.gender, esa.annual_ctc as ctc
         FROM employees e
         LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
         WHERE e.tenant_id = $1 AND e.id = $2`,
        [tenantId, employeeId]
    );

    if (empRes.rowCount === 0) return null;
    const emp = empRes.rows[0];

    // 2. Get Regime and Declarations
    const regimeRes = await db.query(
        `SELECT regime FROM employee_tax_regimes 
         WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3`,
        [tenantId, employeeId, fy]
    );
    const regime = regimeRes.rows[0]?.regime || 'NEW';

    const decls = await getDeclarations(tenantId, employeeId, fy);

    // 3. Map to calculator format
    const taxDecl = { regime };

    // We need basic and hra for HRA exemption calculation
    // Since this is real-time, we estimate them as 50% and 10% of gross if not precisely known
    // but better to fetch components if possible. For simplicity, we'll use estimates or pass them.
    const annualGross = parseFloat(emp.ctc) || 0;
    taxDecl.annual_basic = annualGross * 0.5; // Benchmark
    taxDecl.actual_hra = annualGross * 0.1;   // Benchmark

    decls.forEach(d => {
        const amount = parseFloat(d.approved_amount || d.declared_amount) || 0;
        if (d.section_code === '80C') taxDecl.investments_80c = (taxDecl.investments_80c || 0) + amount;
        else if (d.section_code === '80D') taxDecl.investments_80d = (taxDecl.investments_80d || 0) + amount;
        else if (d.section_code === 'HRA') {
            taxDecl.rent_paid = amount;
            // metadata might contain is_metro
            if (d.metadata?.is_metro) taxDecl.is_metro = true;
        }
        else if (d.section_code === 'LTA') taxDecl.lta = amount;
        else if (d.section_code === 'OTHER') taxDecl.other_exemptions = (taxDecl.other_exemptions || 0) + amount;
    });

    const age = emp.date_of_birth ? calculateAge(emp.date_of_birth) : 30;
    const tdsResult = statutoryCalculator.calculateTDS(annualGross, taxDecl, age);

    return tdsResult;
};

module.exports = {
    getTaxSections,
    createTaxSection,
    getRegime,
    setRegime,
    freezeRegime,
    getDeclarations,
    upsertDeclaration,
    deleteDeclaration,
    adminReviewDeclaration,
    getAdminReviewList,
    calculateProjectedTDS
};
