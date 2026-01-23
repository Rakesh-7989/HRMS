const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* -------------------------- GET TASKS -------------------------- */
exports.getTasks = async (db, opts, actor) => {
    const query = getQuery(db);
    const params = [actor.tenantId];
    let filter = "WHERE tenant_id = $1";

    // If not admin/HR, only show own tasks
    if (!["ADMIN", "HR"].includes(actor.role)) {
        filter += " AND employee_id = (SELECT id FROM employees WHERE user_id = $2)";
        params.push(actor.id);
    } else if (opts.employee_id) {
        filter += ` AND employee_id = $${params.length + 1}`;
        params.push(opts.employee_id);
    }

    if (opts.category) {
        filter += ` AND category = $${params.length + 1}`;
        params.push(opts.category);
    }

    if (opts.status) {
        filter += ` AND status = $${params.length + 1}`;
        params.push(opts.status);
    }

    const sql = `SELECT * FROM inbox_tasks ${filter} ORDER BY created_at DESC`;
    const result = await query(sql, params);
    return result.rows;
};

/* -------------------------- CREATE TASK -------------------------- */
exports.createTask = async (db, data, actor) => {
    const query = getQuery(db);

    const res = await query(
        `INSERT INTO inbox_tasks 
      (tenant_id, employee_id, category, title, description, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [
            actor.tenantId,
            data.employee_id,
            data.category,
            data.title,
            data.description || null,
            data.due_date || null,
            actor.id
        ]
    );

    return res.rows[0];
};

/* -------------------------- UPDATE TASK STATUS -------------------------- */
exports.updateTaskStatus = async (db, id, status, actor) => {
    const query = getQuery(db);

    const res = await query(
        `UPDATE inbox_tasks SET status = $1, updated_at = now() 
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
        [status, id, actor.tenantId]
    );

    return res.rows[0];
};

/* -------------------------- GET ACTIVITY -------------------------- */
exports.getActivities = async (db, taskId, tenantId) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT a.*, u.email, e.first_name, e.last_name 
     FROM inbox_activities a
     JOIN users u ON a.actor_id = u.id
     LEFT JOIN employees e ON e.user_id = u.id
     JOIN inbox_tasks t ON a.task_id = t.id
     WHERE a.task_id = $1 AND t.tenant_id = $2
     ORDER BY a.created_at ASC`,
        [taskId, tenantId]
    );

    return res.rows;
};

/* -------------------------- ADD ACTIVITY (REPLY) -------------------------- */
exports.addActivity = async (db, taskId, message, actor) => {
    const query = getQuery(db);

    // Verify task belongs to tenant
    const taskCheck = await query(
        `SELECT id FROM inbox_tasks WHERE id = $1 AND tenant_id = $2`,
        [taskId, actor.tenantId]
    );
    if (taskCheck.rowCount === 0) throw new Error("Task not found");

    const res = await query(
        `INSERT INTO inbox_activities (task_id, actor_id, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [taskId, actor.id, message]
    );

    return res.rows[0];
};
