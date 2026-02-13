const db = require("../../../config/db");

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
    // Check if frozen
    const existing = await getRegime(tenantId, employeeId, fy);
    if (existing.is_frozen) {
        throw new Error("Tax regime selection is frozen for this financial year.");
    }

    const result = await db.query(
        `INSERT INTO employee_tax_regimes (tenant_id, employee_id, financial_year, regime)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, financial_year) 
         DO UPDATE SET regime = $4, updated_at = NOW()
         RETURNING *`,
        [tenantId, employeeId, fy, regime]
    );
    return result.rows[0];
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
    const { financialYear, sectionId, declaredAmount, proofUrl } = payload;

    // Check if regime is frozen/approved? (Usually declarations can modify until cutoff)
    // For "fully dynamic", we verify if section matches regime? (Assume validation happens upstream or ignored)

    const result = await db.query(
        `INSERT INTO it_declarations (
            tenant_id, employee_id, financial_year, section_id, 
            declared_amount, proof_url, status, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)
         ON CONFLICT DO UPDATE SET -- Note: ID is UUID, so insert always creates new row unless we enforce uniqueness on section?
         -- Actually, multiple entries for same section allowed? Usually Yes (e.g. multiple LIC receipts).
         -- But typically grouped. Let's assume Update if ID provided, else Insert.
         -- WAIT, previous schema has ID PK. So this is pure Insert.
         -- If editing, user sends ID.
         -- This function handles ONE ITEM.
    `,
        // Wait, let's redesign to handle ID for update.
        []
    );

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
    getAdminReviewList
};
