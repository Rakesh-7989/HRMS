const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getPlans = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT id, name, bonus_type AS type, frequency, eligibility_criteria::text AS eligibility_criteria,
                calculation_basis AS calculation_method, calculation_value, max_amount, is_active, created_at
         FROM bonus_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.createPlan = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO bonus_plans (tenant_id, name, bonus_type, frequency, eligibility_criteria, calculation_basis, calculation_value, max_amount, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9) RETURNING *`,
        [tenantId, data.name, data.type, data.frequency, JSON.stringify({ criteria: data.eligibility_criteria || '' }), data.calculation_method, data.calculation_value, data.max_amount || null, userId]
    );
    return res.rows[0];
};

exports.updatePlan = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.type !== undefined) { fields.push(`bonus_type = $${idx++}`); params.push(data.type); }
    if (data.frequency !== undefined) { fields.push(`frequency = $${idx++}`); params.push(data.frequency); }
    if (data.eligibility_criteria !== undefined) { fields.push(`eligibility_criteria = $${idx++}::jsonb`); params.push(JSON.stringify({ criteria: data.eligibility_criteria })); }
    if (data.calculation_method !== undefined) { fields.push(`calculation_basis = $${idx++}`); params.push(data.calculation_method); }
    if (data.calculation_value !== undefined) { fields.push(`calculation_value = $${idx++}`); params.push(data.calculation_value); }
    if (data.max_amount !== undefined) { fields.push(`max_amount = $${idx++}`); params.push(data.max_amount); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.is_active); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE bonus_plans SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};

exports.getEmployeeBonuses = async (db, tenantId, status) => {
    const query = getQuery(db);
    let sql = `SELECT eb.id, eb.employee_id, eb.plan_id AS bonus_plan_id, eb.amount,
                     eb.period_month AS payout_month, eb.period_year AS payout_year,
                     eb.status, eb.reason AS remarks, eb.approved_by, eb.paid_at,
                     eb.created_at,
                     jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name, 'email', e.email) AS employee,
                     jsonb_build_object('name', bp.name, 'type', bp.bonus_type) AS plan
              FROM employee_bonuses eb
              LEFT JOIN employees e ON e.id = eb.employee_id AND e.tenant_id = $1
              LEFT JOIN bonus_plans bp ON bp.id = eb.plan_id
              WHERE eb.tenant_id = $1`;
    const params = [tenantId];
    if (status) {
        sql += ` AND eb.status = $2`;
        params.push(status);
    }
    sql += ` ORDER BY eb.created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.createEmployeeBonus = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO employee_bonuses (tenant_id, employee_id, plan_id, amount, period_month, period_year, reason, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, data.employee_id, data.bonus_plan_id, data.amount, data.payout_month, data.payout_year, data.remarks || null, userId]
    );
    return res.rows[0];
};

exports.approveBonus = async (db, tenantId, id, userId) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE employee_bonuses SET status = 'APPROVED', approved_by = $1, approved_at = now(), updated_at = now()
         WHERE tenant_id = $2 AND id = $3 AND status = 'PENDING' RETURNING *`,
        [userId, tenantId, id]
    );
    return res.rows[0] || null;
};

exports.payBonus = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE employee_bonuses SET status = 'PAID', paid_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND id = $2 AND status = 'APPROVED' RETURNING *`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getCommissions = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT id, name, commission_type AS calculation_type, rate AS value, threshold,
                applicable_to[1] AS applicable_to, is_active
         FROM commission_structures WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return res.rows.map(r => ({ ...r, frequency: 'PER_TRANSACTION' }));
};

exports.createCommission = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO commission_structures (tenant_id, name, commission_type, rate, threshold, applicable_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7) RETURNING *`,
        [tenantId, data.name, data.calculation_type, data.value, data.threshold || null, [data.applicable_to], userId]
    );
    return res.rows[0];
};

exports.updateCommission = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.calculation_type !== undefined) { fields.push(`commission_type = $${idx++}`); params.push(data.calculation_type); }
    if (data.value !== undefined) { fields.push(`rate = $${idx++}`); params.push(data.value); }
    if (data.threshold !== undefined) { fields.push(`threshold = $${idx++}`); params.push(data.threshold); }
    if (data.applicable_to !== undefined) { fields.push(`applicable_to = $${idx++}::text[]`); params.push([data.applicable_to]); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.is_active); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE commission_structures SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};
