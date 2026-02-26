const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* -------------------------- GET TASKS -------------------------- */
exports.getTasks = async (db, opts, actor) => {
    const query = getQuery(db);
    const params = [actor.tenantId];
    let filter = "WHERE tenant_id = $1";

    // If not admin/HR, only show own tasks
    if (!actor.permissions.includes('view_all_employees') && !actor.permissions.includes('manage_organization')) {
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

    const task = res.rows[0];

    // Create a notification for the task owner
    try {
        const userRes = await query(`SELECT user_id FROM employees WHERE id = $1`, [data.employee_id]);
        if (userRes.rowCount > 0) {
            await exports.createNotification(db, {
                tenant_id: actor.tenantId,
                user_id: userRes.rows[0].user_id,
                title: `New Task: ${data.title}`,
                message: `You have been assigned a new task in the ${data.category} category.`,
                type: 'info',
                link: '/inbox'
            });
        }
    } catch (err) {
        console.error('Error creating task notification:', err);
    }

    return task;
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

/* -------------------------- NOTIFICATIONS -------------------------- */

exports.getNotifications = async (db, opts, actor) => {
    const query = getQuery(db);
    const limit = parseInt(opts.limit) || 20;
    const offset = parseInt(opts.offset) || 0;

    const res = await query(
        `SELECT * FROM notifications 
         WHERE tenant_id = $1 AND user_id = $2 
         ORDER BY created_at DESC 
         LIMIT $3 OFFSET $4`,
        [actor.tenantId, actor.id, limit, offset]
    );

    const countRes = await query(
        `SELECT COUNT(*) as total, 
                COUNT(*) FILTER (WHERE read = false) as unread
         FROM notifications 
         WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, actor.id]
    );

    return {
        notifications: res.rows,
        total_count: parseInt(countRes.rows[0].total),
        unread_count: parseInt(countRes.rows[0].unread)
    };
};

exports.getUnreadCount = async (db, actor) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE tenant_id = $1 AND user_id = $2 AND read = false`,
        [actor.tenantId, actor.id]
    );
    return parseInt(res.rows[0].count);
};

exports.createNotification = async (db, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO notifications 
            (tenant_id, user_id, title, message, type, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            data.tenant_id,
            data.user_id,
            data.title,
            data.message,
            data.type || 'info',
            data.link || null,
            data.metadata || {}
        ]
    );
    return res.rows[0];
};

exports.markAsRead = async (db, id, actor) => {
    const query = getQuery(db);
    await query(
        `UPDATE notifications SET read = true, updated_at = now() 
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
        [id, actor.tenantId, actor.id]
    );
};

exports.markAllAsRead = async (db, actor) => {
    const query = getQuery(db);
    await query(
        `UPDATE notifications SET read = true, updated_at = now() 
         WHERE tenant_id = $1 AND user_id = $2 AND read = false`,
        [actor.tenantId, actor.id]
    );
};

exports.deleteNotification = async (db, id, actor) => {
    const query = getQuery(db);
    await query(
        `DELETE FROM notifications 
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
        [id, actor.tenantId, actor.id]
    );
};
