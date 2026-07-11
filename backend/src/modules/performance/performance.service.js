const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getCycles = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT id, title, cycle_type AS review_type, start_date, end_date, status, created_at,
                cycle_type AS period
         FROM performance_review_cycles WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.getCycle = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT id, title, cycle_type AS review_type, start_date, end_date, status, created_at,
                cycle_type AS period
         FROM performance_review_cycles WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.createCycle = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO performance_review_cycles (tenant_id, title, cycle_type, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, data.title, data.review_type, data.start_date, data.end_date, userId]
    );
    return res.rows[0];
};

exports.updateCycle = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); params.push(data.title); }
    if (data.review_type !== undefined) { fields.push(`cycle_type = $${idx++}`); params.push(data.review_type); }
    if (data.start_date !== undefined) { fields.push(`start_date = $${idx++}`); params.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push(`end_date = $${idx++}`); params.push(data.end_date); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); params.push(data.status); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE performance_review_cycles SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};

exports.closeCycle = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE performance_review_cycles SET status = 'CLOSED', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getReviews = async (db, tenantId, cycleId) => {
    const query = getQuery(db);
    let sql = `SELECT pr.id, pr.employee_id, pr.cycle_id, pr.reviewer_id, pr.rating, pr.comments,
                      pr.status, pr.created_at, pr.submitted_at,
                      jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name, 'email', e.email) AS employee,
                      jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name) AS reviewer
               FROM performance_reviews pr
               LEFT JOIN employees e ON e.id = pr.employee_id AND e.tenant_id = $1
               LEFT JOIN employees r ON r.id = pr.reviewer_id
               WHERE pr.tenant_id = $1`;
    const params = [tenantId];
    if (cycleId) {
        sql += ` AND pr.cycle_id = $2`;
        params.push(cycleId);
    }
    sql += ` ORDER BY pr.created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.getMyReviews = async (db, tenantId, userId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT pr.id, pr.employee_id, pr.cycle_id, pr.reviewer_id, pr.rating, pr.comments,
                pr.status, pr.created_at, pr.submitted_at,
                jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name, 'email', e.email) AS employee,
                jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name) AS reviewer
         FROM performance_reviews pr
         LEFT JOIN employees e ON e.id = pr.employee_id AND e.tenant_id = $1
         LEFT JOIN employees r ON r.id = pr.reviewer_id
         WHERE pr.tenant_id = $1 AND pr.reviewer_id = (SELECT id FROM employees WHERE user_id = $2 AND tenant_id = $1 LIMIT 1)
         ORDER BY pr.created_at DESC`,
        [tenantId, userId]
    );
    return res.rows;
};

exports.submitReview = async (db, tenantId, id, rating, comments) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE performance_reviews SET rating = $1, comments = $2, status = 'SUBMITTED', submitted_at = now(), updated_at = now()
         WHERE tenant_id = $3 AND id = $4 RETURNING *`,
        [rating, comments, tenantId, id]
    );
    return res.rows[0] || null;
};

exports.acknowledgeReview = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE performance_reviews SET status = 'ACKNOWLEDGED', acknowledged_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getGoals = async (db, tenantId, employeeId) => {
    const query = getQuery(db);
    let sql = `SELECT pg.id, pg.employee_id, pg.title, pg.description, pg.goal_type AS category,
                      pg.target_value, pg.current_value, pg.start_date, pg.end_date, pg.status,
                      jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name) AS employee
               FROM performance_goals pg
               LEFT JOIN employees e ON e.id = pg.employee_id AND e.tenant_id = $1
               WHERE pg.tenant_id = $1`;
    const params = [tenantId];
    if (employeeId) {
        sql += ` AND pg.employee_id = $2`;
        params.push(employeeId);
    }
    sql += ` ORDER BY pg.created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.getMyGoals = async (db, tenantId, userId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT pg.id, pg.employee_id, pg.title, pg.description, pg.goal_type AS category,
                pg.target_value, pg.current_value, pg.start_date, pg.end_date, pg.status,
                jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name) AS employee
         FROM performance_goals pg
         LEFT JOIN employees e ON e.id = pg.employee_id AND e.tenant_id = $1
         WHERE pg.tenant_id = $1 AND pg.employee_id = (SELECT id FROM employees WHERE user_id = $2 AND tenant_id = $1 LIMIT 1)
         ORDER BY pg.created_at DESC`,
        [tenantId, userId]
    );
    return res.rows;
};

exports.createGoal = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO performance_goals (tenant_id, employee_id, title, description, goal_type, target_value, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [tenantId, data.employee_id, data.title, data.description || null, data.category, data.target_value || null, data.start_date || null, data.end_date || null, userId]
    );
    return res.rows[0];
};

exports.updateGoal = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); params.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.category !== undefined) { fields.push(`goal_type = $${idx++}`); params.push(data.category); }
    if (data.target_value !== undefined) { fields.push(`target_value = $${idx++}`); params.push(data.target_value); }
    if (data.start_date !== undefined) { fields.push(`start_date = $${idx++}`); params.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push(`end_date = $${idx++}`); params.push(data.end_date); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); params.push(data.status); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE performance_goals SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};

exports.updateGoalProgress = async (db, tenantId, id, currentValue) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE performance_goals SET current_value = $1, status = CASE WHEN $1 >= target_value THEN 'ACHIEVED' ELSE 'IN_PROGRESS' END, updated_at = now()
         WHERE tenant_id = $2 AND id = $3 RETURNING *`,
        [currentValue, tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getFeedbackRequests = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT pfr.id, pfr.employee_id, pfr.requested_from AS requester_id, pfr.message, pfr.response,
                pfr.status, pfr.created_at, pfr.updated_at AS responded_at,
                jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name) AS employee,
                jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name) AS requester
         FROM performance_feedback_requests pfr
         LEFT JOIN employees e ON e.id = pfr.employee_id AND e.tenant_id = $1
         LEFT JOIN employees r ON r.id = pfr.requested_from
         WHERE pfr.tenant_id = $1 ORDER BY pfr.created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.getPendingFeedback = async (db, tenantId, userId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT pfr.id, pfr.employee_id, pfr.requested_from AS requester_id, pfr.message, pfr.response,
                pfr.status, pfr.created_at, pfr.updated_at AS responded_at,
                jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name) AS employee,
                jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name) AS requester
         FROM performance_feedback_requests pfr
         LEFT JOIN employees e ON e.id = pfr.employee_id AND e.tenant_id = $1
         LEFT JOIN employees r ON r.id = pfr.requested_from
         WHERE pfr.tenant_id = $1 AND pfr.status = 'PENDING' AND pfr.requested_from = (SELECT id FROM employees WHERE user_id = $2 AND tenant_id = $1 LIMIT 1)
         ORDER BY pfr.created_at DESC`,
        [tenantId, userId]
    );
    return res.rows;
};

exports.requestFeedback = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const requesterRes = await query(
        `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
        [userId, tenantId]
    );
    const requesterEmployeeId = requesterRes.rows[0]?.id;
    if (!requesterEmployeeId) throw new Error("Employee record not found for requester");
    const res = await query(
        `INSERT INTO performance_feedback_requests (tenant_id, employee_id, requested_from, message, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, data.employee_id, requesterEmployeeId, data.message, userId]
    );
    return res.rows[0];
};

exports.submitFeedbackResponse = async (db, tenantId, id, response) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE performance_feedback_requests SET response = $1, status = 'SUBMITTED', updated_at = now()
         WHERE tenant_id = $2 AND id = $3 RETURNING *`,
        [response, tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getTemplates = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT id, name, sections, is_active, 5 AS rating_scale
         FROM performance_review_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.createTemplate = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO performance_review_templates (tenant_id, name, sections, created_by)
         VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
        [tenantId, data.name, JSON.stringify(data.sections || []), userId]
    );
    return res.rows[0];
};

exports.updateTemplate = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.sections !== undefined) { fields.push(`sections = $${idx++}::jsonb`); params.push(JSON.stringify(data.sections)); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.is_active); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE performance_review_templates SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};
