const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getSurveys = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT s.*,
            (SELECT COUNT(*) FROM engagement_survey_responses WHERE survey_id = s.id) as response_count,
            (SELECT COUNT(*) FROM employees e WHERE e.tenant_id = s.tenant_id) as total_count
         FROM engagement_surveys s
         WHERE s.tenant_id = $1
         ORDER BY s.created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.createSurvey = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO engagement_surveys (tenant_id, title, description, survey_type, questions, status, starts_at, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'DRAFT', $6, $7, $8) RETURNING *`,
        [tenantId, data.title, data.description || null, data.survey_type, JSON.stringify(data.questions || []), data.starts_at || null, data.ends_at || null, userId]
    );
    return res.rows[0];
};

exports.submitResponse = async (db, surveyId, employeeId, answers) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO engagement_survey_responses (survey_id, employee_id, answers)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (survey_id, employee_id) DO UPDATE SET answers = $3::jsonb, submitted_at = now()
         RETURNING *`,
        [surveyId, employeeId, JSON.stringify(answers)]
    );
    return res.rows[0];
};

exports.getRecognition = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT r.*,
            jsonb_build_object('first_name', fe.first_name, 'last_name', fe.last_name) as from_employee,
            jsonb_build_object('first_name', te.first_name, 'last_name', te.last_name) as to_employee
         FROM engagement_recognition r
         JOIN employees fe ON fe.id = r.from_employee_id
         JOIN employees te ON te.id = r.to_employee_id
         WHERE r.tenant_id = $1
         ORDER BY r.created_at DESC`,
        [tenantId]
    );
    return res.rows;
};

exports.sendRecognition = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO engagement_recognition (tenant_id, from_employee_id, to_employee_id, category, message)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, userId, data.to_employee_id, data.category, data.message]
    );
    return res.rows[0];
};

exports.getCelebrations = async (db, tenantId, month) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT e.id as employee_id,
                jsonb_build_object('first_name', e.first_name, 'last_name', e.last_name, 'email', e.email) as employee,
                e.date_of_birth,
                e.date_of_joining
         FROM employees e
         WHERE e.tenant_id = $1
           AND e.status = 'Active'
           AND (
               EXTRACT(MONTH FROM e.date_of_birth) = $2
               OR EXTRACT(MONTH FROM e.date_of_joining) = $2
           )
         ORDER BY e.first_name`,
        [tenantId, month]
    );
    return res.rows.map(r => {
        const items = [];
        const birthMonth = r.date_of_birth ? new Date(r.date_of_birth).getMonth() + 1 : null;
        const joinMonth = r.date_of_joining ? new Date(r.date_of_joining).getMonth() + 1 : null;
        if (birthMonth === month) {
            const d = new Date(r.date_of_birth);
            items.push({
                id: `${r.employee_id}-birthday`,
                employee_id: r.employee_id,
                type: 'BIRTHDAY',
                date: new Date(new Date().getFullYear(), d.getMonth(), d.getDate()).toISOString(),
                employee: r.employee
            });
        }
        if (joinMonth === month) {
            const d = new Date(r.date_of_joining);
            items.push({
                id: `${r.employee_id}-anniversary`,
                employee_id: r.employee_id,
                type: 'WORK_ANNIVERSARY',
                date: new Date(new Date().getFullYear(), d.getMonth(), d.getDate()).toISOString(),
                employee: r.employee
            });
        }
        return items;
    }).flat();
};
