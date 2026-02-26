const pool = require("../../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

// Issue 22: Added actor-based filtering for role-based visibility
exports.getLeaveTrendReport = async (db, tenantId, filters = {}, actor = null) => {
    const query = getQuery(db);

    const params = [tenantId];
    let where = `WHERE la.tenant_id = $1 AND la.status = 'APPROVED'`;
    let i = 2;

    // Issue 22: Manager filter — only show direct reports' data
    if (actor && actor.role === 'MANAGER' && actor.employeeId) {
        where += ` AND la.employee_id IN (SELECT id FROM employees WHERE reports_to = $${i})`;
        params.push(actor.employeeId);
        i++;
    }

    if (filters.from_date) {
        where += ` AND la.start_date >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        where += ` AND la.end_date <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    const res = await query(
        `SELECT 
            DATE_TRUNC('month', la.start_date) AS month,
            lt.name AS leave_type,
            COUNT(*) AS request_count,
            SUM(COALESCE(la.days_count, 
                CASE WHEN la.is_half_day THEN 0.5 
                ELSE (la.end_date - la.start_date + 1) END
            )) AS total_days
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where}
         GROUP BY DATE_TRUNC('month', la.start_date), lt.name
         ORDER BY month DESC, lt.name`,
        params
    );

    return res.rows;
};

// Issue 22: Added actor-based filtering
exports.getAbsenteeismReport = async (db, tenantId, filters = {}, actor = null) => {
    const query = getQuery(db);

    const params = [tenantId];
    let where = `WHERE la.tenant_id = $1 AND la.status = 'APPROVED'`;
    let i = 2;

    // Issue 22: Manager filter
    if (actor && actor.role === 'MANAGER' && actor.employeeId) {
        where += ` AND e.reports_to = $${i}`;
        params.push(actor.employeeId);
        i++;
    }

    if (filters.from_date) {
        where += ` AND la.start_date >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        where += ` AND la.end_date <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    if (filters.department_id) {
        where += ` AND e.department_id = $${i}`;
        params.push(filters.department_id);
        i++;
    }

    const res = await query(
        `SELECT 
            e.id AS employee_id,
            e.first_name,
            e.last_name,
            u.email,
            d.name AS department,
            COUNT(*) AS leave_count,
            SUM(COALESCE(la.days_count, 
                CASE WHEN la.is_half_day THEN 0.5 
                ELSE (la.end_date - la.start_date + 1) END
            )) AS total_days_absent
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         JOIN users u ON u.id = e.user_id
         LEFT JOIN departments d ON d.id = e.department_id
         ${where}
         GROUP BY e.id, e.first_name, e.last_name, u.email, d.name
         ORDER BY total_days_absent DESC`,
        params
    );

    return res.rows;
};

// Issue 22: Added actor-based filtering
exports.getDepartmentWiseReport = async (db, tenantId, filters = {}, actor = null) => {
    const query = getQuery(db);

    const params = [tenantId];
    let where = `WHERE la.tenant_id = $1 AND la.status = 'APPROVED'`;
    let i = 2;

    // Issue 22: Manager filter
    if (actor && actor.role === 'MANAGER' && actor.employeeId) {
        where += ` AND e.reports_to = $${i}`;
        params.push(actor.employeeId);
        i++;
    }

    if (filters.from_date) {
        where += ` AND la.start_date >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        where += ` AND la.end_date <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    const res = await query(
        `SELECT 
            COALESCE(d.name, 'Unassigned') AS department,
            lt.name AS leave_type,
            COUNT(*) AS request_count,
            SUM(COALESCE(la.days_count, 
                CASE WHEN la.is_half_day THEN 0.5 
                ELSE (la.end_date - la.start_date + 1) END
            )) AS total_days
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where}
         GROUP BY d.name, lt.name
         ORDER BY department, lt.name`,
        params
    );

    return res.rows;
};

exports.getEmployeeLeaveReport = async (db, employeeId, tenantId, filters = {}) => {
    const query = getQuery(db);

    const params = [tenantId, employeeId];
    let where = `WHERE la.tenant_id = $1 AND la.employee_id = $2`;
    let i = 3;

    if (filters.from_date) {
        where += ` AND la.start_date >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        where += ` AND la.end_date <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    if (filters.status) {
        where += ` AND la.status = $${i}`;
        params.push(filters.status);
        i++;
    }

    const history = await query(
        `SELECT la.*, lt.name AS leave_type_name, lt.code AS leave_type_code,
                approver.email AS approved_by_email
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         LEFT JOIN users approver ON approver.id = la.approved_by
         ${where}
         ORDER BY la.created_at DESC`,
        params
    );

    const currentYear = new Date().getFullYear();
    const balances = await query(
        `SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lb.year = $3`,
        [tenantId, employeeId, currentYear]
    );

    const summary = await query(
        `SELECT 
            lt.name AS leave_type,
            COUNT(*) AS total_requests,
            SUM(CASE WHEN la.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN la.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
            SUM(CASE WHEN la.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN la.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN la.status = 'APPROVED' THEN 
                COALESCE(la.days_count, CASE WHEN la.is_half_day THEN 0.5 ELSE (la.end_date - la.start_date + 1) END)
                ELSE 0 END) AS days_used
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where}
         GROUP BY lt.name
         ORDER BY lt.name`,
        params
    );

    return {
        history: history.rows,
        balances: balances.rows,
        summary: summary.rows
    };
};

exports.getPendingAgeingReport = async (db, tenantId) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT 
            la.id,
            e.first_name, e.last_name,
            u.email,
            lt.name AS leave_type,
            la.start_date,
            la.end_date,
            la.created_at,
            EXTRACT(DAY FROM NOW() - la.created_at)::INTEGER AS days_pending,
            m.email AS manager_email,
            me.first_name AS manager_first_name
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         JOIN users u ON u.id = e.user_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         LEFT JOIN employees me ON me.id = e.reports_to
         LEFT JOIN users m ON m.id = me.user_id
         WHERE la.tenant_id = $1 AND la.status = 'PENDING'
         ORDER BY la.created_at ASC`,
        [tenantId]
    );

    return res.rows;
};

exports.getUpcomingLeavesReport = async (db, tenantId, daysAhead = 30) => {
    const query = getQuery(db);
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const res = await query(
        `SELECT 
            la.id,
            e.first_name, e.last_name,
            u.email,
            d.name AS department,
            lt.name AS leave_type,
            la.start_date,
            la.end_date,
            la.is_half_day,
            COALESCE(la.days_count, 
                CASE WHEN la.is_half_day THEN 0.5 
                ELSE (la.end_date - la.start_date + 1) END
            ) AS days
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         JOIN users u ON u.id = e.user_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         WHERE la.tenant_id = $1 
           AND la.status = 'APPROVED'
           AND la.start_date >= $2
           AND la.start_date <= $3
         ORDER BY la.start_date ASC`,
        [tenantId, today, futureDate.toISOString().split('T')[0]]
    );

    return res.rows;
};
