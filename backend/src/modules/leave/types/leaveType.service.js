const pool = require("../../../config/db");
const leavePolicyService = require("../policies/leavePolicy.service");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ========================== CREATE LEAVE TYPE ========================== */
exports.createLeaveType = async (db, data, actor) => {
    const query = getQuery(db);

    // Check for duplicate code
    const existing = await query(
        `SELECT id FROM leave_types WHERE tenant_id = $1 AND code = $2`,
        [actor.tenantId, data.code.toUpperCase()]
    );
    if (existing.rowCount > 0) {
        throw new Error(`Leave type with code '${data.code}' already exists`);
    }

    const res = await query(
        `INSERT INTO leave_types 
            (tenant_id, name, code, description, is_paid, requires_approval, 
             requires_attachment, min_days_notice, max_consecutive_days, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            actor.tenantId,
            data.name,
            data.code.toUpperCase(),
            data.description || null,
            data.is_paid !== false,
            data.requires_approval !== false,
            data.requires_attachment || false,
            data.min_days_notice || 0,
            data.max_consecutive_days || null,
            actor.id
        ]
    );

    const leaveType = res.rows[0];

    // Auto-create default policy if accrual details provided
    if (data.default_accrual_rate > 0) {
        await leavePolicyService.createPolicy(db, {
            leave_type_id: leaveType.id,
            name: `${data.name} Default Policy`,
            description: `Auto-generated default policy for ${data.name}`,
            accrual_type: 'MONTHLY',
            accrual_rate: data.default_accrual_rate,
            max_balance: data.default_max_balance || null,
            year_start_month: 1,
            priority: 100,
            is_probation_eligible: false,
            min_tenure_months: 0
        }, actor);
    }

    return leaveType;
};

/* ========================== GET LEAVE TYPES ========================== */
exports.getLeaveTypes = async (db, tenantId, includeInactive = false) => {
    const query = getQuery(db);

    let sql = `SELECT * FROM leave_types WHERE tenant_id = $1`;
    if (!includeInactive) {
        sql += ` AND is_active = true`;
    }
    sql += ` ORDER BY name ASC`;

    const res = await query(sql, [tenantId]);
    return res.rows;
};

/* ========================== GET LEAVE TYPE BY ID ========================== */
exports.getLeaveTypeById = async (db, id, tenantId) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT * FROM leave_types WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );

    return res.rows[0] || null;
};

/* ========================== UPDATE LEAVE TYPE ========================== */
exports.updateLeaveType = async (db, id, updates, actor) => {
    const query = getQuery(db);

    const allowed = [
        "name", "description", "is_paid", "requires_approval",
        "requires_attachment", "min_days_notice", "max_consecutive_days", "is_active"
    ];

    const fields = [];
    const params = [];
    let i = 1;

    for (const key of allowed) {
        if (updates[key] !== undefined) {
            fields.push(`${key} = $${i}`);
            params.push(updates[key]);
            i++;
        }
    }

    if (fields.length === 0) {
        throw new Error("No valid fields to update");
    }

    params.push(id, actor.tenantId);

    const res = await query(
        `UPDATE leave_types 
         SET ${fields.join(", ")}, updated_at = now()
         WHERE id = $${i} AND tenant_id = $${i + 1}
         RETURNING *`,
        params
    );

    if (res.rowCount === 0) {
        throw new Error("Leave type not found");
    }

    return res.rows[0];
};

/* ========================== DELETE LEAVE TYPE (SOFT) ========================== */
exports.deleteLeaveType = async (db, id, actor) => {
    const query = getQuery(db);

    // Check if leave type is in use
    const inUse = await query(
        `SELECT id FROM leave_applications WHERE leave_type_id = $1 LIMIT 1`,
        [id]
    );

    if (inUse.rowCount > 0) {
        // Soft delete - just deactivate
        await query(
            `UPDATE leave_types SET is_active = false, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
            [id, actor.tenantId]
        );
        return { success: true, message: "Leave type deactivated (in use by existing applications)" };
    }

    // Hard delete if not in use
    await query(
        `DELETE FROM leave_types WHERE id = $1 AND tenant_id = $2`,
        [id, actor.tenantId]
    );

    return { success: true, message: "Leave type deleted" };
};
