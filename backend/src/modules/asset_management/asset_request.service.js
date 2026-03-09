const pool = require("../../config/db");
const crypto = require("crypto");
const { NotFoundError, BadRequestError } = require("../../utils/customErrors");

/**
 * CREATE ASSET REQUEST
 */
exports.createRequest = async (tenantId, employeeId, { asset_category, priority, reason }) => {
    const requestId = crypto.randomUUID();
    const result = await pool.query(
        `INSERT INTO asset_requests (
            id, tenant_id, employee_id, asset_category, priority, reason, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        RETURNING *`,
        [requestId, tenantId, employeeId, asset_category, priority || 'MEDIUM', reason]
    );
    return result.rows[0];
};

/**
 * LIST ASSET REQUESTS
 */
exports.listRequests = async (tenantId, filters = {}, userRole, employeeId) => {
    let query = `
        SELECT r.*, e.first_name, e.last_name
        FROM asset_requests r
        JOIN employees e ON r.employee_id = e.id
        WHERE r.tenant_id = $1
    `;
    const params = [tenantId];
    let paramCount = 1;

    if (userRole === 'EMPLOYEE') {
        query += ` AND r.employee_id = $${++paramCount}`;
        params.push(employeeId);
    }

    if (filters.status) {
        query += ` AND r.status = $${++paramCount}`;
        params.push(filters.status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};

/**
 * UPDATE REQUEST STATUS (Admin/Manager)
 */
exports.updateRequestStatus = async (tenantId, requestId, status, adminNotes, adminUserId) => {
    const result = await pool.query(
        `UPDATE asset_requests
         SET status = $1, admin_notes = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [status, adminNotes, adminUserId, requestId, tenantId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError("Asset request not found");
    }

    return result.rows[0];
};

/**
 * CANCEL REQUEST (Employee)
 */
exports.cancelRequest = async (tenantId, requestId, employeeId) => {
    const result = await pool.query(
        `UPDATE asset_requests
         SET status = 'CANCELLED', updated_at = NOW()
         WHERE id = $1 AND employee_id = $2 AND tenant_id = $3 AND status = 'PENDING'
         RETURNING *`,
        [requestId, employeeId, tenantId]
    );

    if (result.rowCount === 0) {
        throw new BadRequestError("Request not found or cannot be cancelled");
    }

    return result.rows[0];
};
