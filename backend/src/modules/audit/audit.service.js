
const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

exports.getAuditLogs = async (db, filters, actor) => {
    const query = getQuery(db);
    const params = [];
    let i = 1;

    // Build WHERE clause
    const conditions = [];

    // Tenant filtering:
    // - SUPER_ADMIN with no tenantId sees logs where tenant_id is NULL (system actions) 
    //   OR if they filter by a tenant.
    // - SUPER_ADMIN usually wants to see everything? Or everything triggered by them?
    // Let's assume SUPER_ADMIN sees ALL logs if no filter provided, or filters by tenant.

    if (actor.role === 'SUPER_ADMIN' && !actor.tenantId) {
        if (filters.tenant_id) {
            conditions.push(`a.tenant_id = $${i++}`);
            params.push(filters.tenant_id);
        }
    } else {
        // Regular admin sees their tenant's logs
        conditions.push(`a.tenant_id = $${i++}`);
        params.push(actor.tenantId);
    }

    // Filter by action
    if (filters.action) {
        conditions.push(`a.action = $${i++}`);
        params.push(filters.action);
    }

    // Filter by target (table)
    if (filters.target_table) {
        conditions.push(`a.target_table = $${i++}`);
        params.push(filters.target_table);
    }

    // Date Range
    if (filters.from_date) {
        conditions.push(`a.created_at >= $${i++}`);
        params.push(filters.from_date);
    }
    if (filters.to_date) {
        conditions.push(`a.created_at <= $${i++}`);
        params.push(filters.to_date); // client should handle EOD time
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const sql = `
    SELECT 
        a.id, 
        a.action, 
        a.target_table, 
        a.target_id, 
        a.created_at, 
        a.old_data, 
        a.new_data,
        u.email as actor_email,
        u.role as actor_role,
        e.first_name as actor_first_name,
        e.last_name as actor_last_name
    FROM audit_logs a
    LEFT JOIN users u ON a.actor_id = u.id
    LEFT JOIN employees e ON e.user_id = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT 100
  `;

    const result = await query(sql, params);
    return result.rows;
};
