const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getJobs = async (db, tenantId, status) => {
    const query = getQuery(db);
    let sql = `SELECT rj.id, rj.title, rj.department, rj.location,
                     rj.employment_type AS type, rj.min_experience AS experience_min,
                     rj.max_experience AS experience_max, rj.min_salary AS salary_min,
                     rj.max_salary AS salary_max, rj.description, rj.requirements,
                     rj.status, rj.openings, rj.created_at,
                     (SELECT COUNT(*) FROM recruitment_candidates rc WHERE rc.job_id = rj.id) AS candidate_count
              FROM recruitment_jobs rj WHERE rj.tenant_id = $1`;
    const params = [tenantId];
    if (status) {
        sql += ` AND rj.status = $2`;
        params.push(status);
    }
    sql += ` ORDER BY rj.created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.getJob = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT rj.id, rj.title, rj.department, rj.location,
                rj.employment_type AS type, rj.min_experience AS experience_min,
                rj.max_experience AS experience_max, rj.min_salary AS salary_min,
                rj.max_salary AS salary_max, rj.description, rj.requirements,
                rj.status, rj.openings, rj.created_at,
                (SELECT COUNT(*) FROM recruitment_candidates rc WHERE rc.job_id = rj.id) AS candidate_count
         FROM recruitment_jobs rj WHERE rj.tenant_id = $1 AND rj.id = $2`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.createJob = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO recruitment_jobs (tenant_id, title, department, location, employment_type, min_experience, max_experience, min_salary, max_salary, description, requirements, openings, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [tenantId, data.title, data.department || null, data.location || null, data.type, data.experience_min || null, data.experience_max || null, data.salary_min || null, data.salary_max || null, data.description || null, data.requirements || null, data.openings, userId]
    );
    return res.rows[0];
};

exports.updateJob = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); params.push(data.title); }
    if (data.department !== undefined) { fields.push(`department = $${idx++}`); params.push(data.department); }
    if (data.location !== undefined) { fields.push(`location = $${idx++}`); params.push(data.location); }
    if (data.type !== undefined) { fields.push(`employment_type = $${idx++}`); params.push(data.type); }
    if (data.experience_min !== undefined) { fields.push(`min_experience = $${idx++}`); params.push(data.experience_min); }
    if (data.experience_max !== undefined) { fields.push(`max_experience = $${idx++}`); params.push(data.experience_max); }
    if (data.salary_min !== undefined) { fields.push(`min_salary = $${idx++}`); params.push(data.salary_min); }
    if (data.salary_max !== undefined) { fields.push(`max_salary = $${idx++}`); params.push(data.salary_max); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.requirements !== undefined) { fields.push(`requirements = $${idx++}`); params.push(data.requirements); }
    if (data.openings !== undefined) { fields.push(`openings = $${idx++}`); params.push(data.openings); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE recruitment_jobs SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};

exports.publishJob = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE recruitment_jobs SET status = 'PUBLISHED', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.closeJob = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE recruitment_jobs SET status = 'CLOSED', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getCandidates = async (db, tenantId, jobId) => {
    const query = getQuery(db);
    let sql = `SELECT rc.id, rc.job_id, rc.first_name, rc.last_name, rc.email, rc.phone,
                     rc.resume_url, rc.source, rc.status, rc.experience_years,
                     rc.current_company, rc.current_position AS current_designation,
                     rc.created_at AS applied_at,
                     jsonb_build_object('title', rj.title, 'department', rj.department) AS job
              FROM recruitment_candidates rc
              LEFT JOIN recruitment_jobs rj ON rj.id = rc.job_id
              WHERE rc.tenant_id = $1`;
    const params = [tenantId];
    if (jobId) {
        sql += ` AND rc.job_id = $2`;
        params.push(jobId);
    }
    sql += ` ORDER BY rc.created_at DESC`;
    const res = await query(sql, params);
    return res.rows.map(c => ({ ...c, name: [c.first_name, c.last_name].filter(Boolean).join(' '), first_name: undefined, last_name: undefined }));
};

exports.getCandidate = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT rc.id, rc.job_id, rc.first_name, rc.last_name, rc.email, rc.phone,
                rc.resume_url, rc.source, rc.status, rc.experience_years,
                rc.current_company, rc.current_position AS current_designation,
                rc.created_at AS applied_at,
                jsonb_build_object('title', rj.title, 'department', rj.department) AS job
         FROM recruitment_candidates rc
         LEFT JOIN recruitment_jobs rj ON rj.id = rc.job_id
         WHERE rc.tenant_id = $1 AND rc.id = $2`,
        [tenantId, id]
    );
    if (res.rows.length === 0) return null;
    const c = res.rows[0];
    return { ...c, name: [c.first_name, c.last_name].filter(Boolean).join(' '), first_name: undefined, last_name: undefined };
};

exports.addCandidate = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const nameParts = (data.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || null;
    const res = await query(
        `INSERT INTO recruitment_candidates (tenant_id, job_id, first_name, last_name, email, phone, source, experience_years, current_company, current_position, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [tenantId, data.job_id, firstName, lastName, data.email, data.phone || null, data.source, data.experience_years || null, data.current_company || null, data.current_designation || null, userId]
    );
    return res.rows[0];
};

exports.updateCandidateStatus = async (db, tenantId, id, status) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE recruitment_candidates SET status = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING *`,
        [status, tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getInterviews = async (db, tenantId, candidateId) => {
    const query = getQuery(db);
    let sql = `SELECT ri.id, ri.candidate_id, ri.interview_type AS mode, ri.scheduled_at,
                     ri.duration_minutes, ri.feedback, ri.rating, ri.status,
                     ri.interviewers[1] AS interviewer_id,
                     jsonb_build_object('name', c.first_name || ' ' || COALESCE(c.last_name, ''), 'email', c.email) AS candidate,
                     jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name) AS interviewer
              FROM recruitment_interviews ri
              LEFT JOIN recruitment_candidates c ON c.id = ri.candidate_id
              LEFT JOIN users u ON u.id = ri.interviewers[1]
              WHERE ri.tenant_id = $1`;
    const params = [tenantId];
    if (candidateId) {
        sql += ` AND ri.candidate_id = $2`;
        params.push(candidateId);
    }
    sql += ` ORDER BY ri.scheduled_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.scheduleInterview = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO recruitment_interviews (tenant_id, candidate_id, interviewers, interview_type, scheduled_at, duration_minutes, status, created_by)
         VALUES ($1, $2, $3::uuid[], $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, data.candidate_id, [data.interviewer_id], data.mode, data.scheduled_at, data.duration_minutes, data.status || 'SCHEDULED', userId]
    );
    return res.rows[0];
};

exports.updateInterview = async (db, tenantId, id, data) => {
    const query = getQuery(db);
    const fields = [];
    const params = [];
    let idx = 1;

    if (data.interviewer_id !== undefined) { fields.push(`interviewers = $${idx++}::uuid[]`); params.push([data.interviewer_id]); }
    if (data.mode !== undefined) { fields.push(`interview_type = $${idx++}`); params.push(data.mode); }
    if (data.scheduled_at !== undefined) { fields.push(`scheduled_at = $${idx++}`); params.push(data.scheduled_at); }
    if (data.duration_minutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); params.push(data.duration_minutes); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); params.push(data.status); }
    fields.push(`updated_at = now()`);

    params.push(tenantId, id);
    const res = await query(
        `UPDATE recruitment_interviews SET ${fields.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
        params
    );
    return res.rows[0] || null;
};

exports.submitFeedback = async (db, tenantId, id, feedback, rating) => {
    const query = getQuery(db);
    const res = await query(
        `UPDATE recruitment_interviews SET feedback = $1, rating = $2, status = 'COMPLETED', updated_at = now()
         WHERE tenant_id = $3 AND id = $4 RETURNING *`,
        [feedback, rating, tenantId, id]
    );
    return res.rows[0] || null;
};
