const timeService = require("../../utils/timeService");
const delegationService = require("../leave/delegations/delegation.service");
const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ========================== REQUEST WFH ========================== */
exports.requestWFH = async (db, data, actor) => {
    const query = getQuery(db);
    const { request_date, reason } = data;

    if (!actor.employeeId) {
        throw new Error("You must have an active employee profile to request WFH.");
    }

    const tz = await timeService.getEffectiveTz(query, actor.tenantId, actor.employeeId);
    const today = timeService.todayDate(tz);

    if (request_date < today) {
        throw new Error("Cannot request WFH for a past date.");
    }

    // Check for existing request for the same date
    const existing = await query(
        `SELECT id, status FROM wfh_requests 
         WHERE tenant_id = $1 AND employee_id = $2 AND request_date = $3`,
        [actor.tenantId, actor.employeeId, request_date]
    );

    if (existing.rowCount > 0) {
        const existingStatus = existing.rows[0].status;
        if (existingStatus === 'PENDING') {
            throw new Error("You already have a pending WFH request for this date.");
        } else if (existingStatus === 'APPROVED') {
            throw new Error("You already have an approved WFH request for this date.");
        }
        // If rejected, allow re-requesting
    }

    const result = await query(
        `INSERT INTO wfh_requests 
            (tenant_id, employee_id, request_date, reason, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [actor.tenantId, actor.employeeId, request_date, reason, actor.id]
    );

    return result.rows[0];
};

/* ========================== GET MY WFH REQUESTS ========================== */
exports.getMyWFHRequests = async (db, actor, params = {}) => {
    const query = getQuery(db);
    const { status, from_date, to_date } = params;

    let sql = `
        SELECT wr.*, 
               ea.first_name as approver_first_name,
               ea.last_name as approver_last_name,
               er.first_name as rejecter_first_name,
               er.last_name as rejecter_last_name
        FROM wfh_requests wr
        LEFT JOIN employees ea ON ea.user_id = wr.approved_by
        LEFT JOIN employees er ON er.user_id = wr.rejected_by
        WHERE wr.tenant_id = $1 AND wr.employee_id = $2
    `;

    const values = [actor.tenantId, actor.employeeId];

    let paramIndex = 3;

    if (status) {
        sql += ` AND wr.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
    }

    if (from_date) {
        sql += ` AND wr.request_date >= $${paramIndex}`;
        values.push(from_date);
        paramIndex++;
    }

    if (to_date) {
        sql += ` AND wr.request_date <= $${paramIndex}`;
        values.push(to_date);
        paramIndex++;
    }

    sql += ` ORDER BY wr.request_date DESC`;

    const result = await query(sql, values);
    return result.rows;
};

/* ========================== GET PENDING WFH REQUESTS (FOR MANAGERS) ========================== */
exports.getPendingWFHRequests = async (db, actor) => {
    const query = getQuery(db);

    let whereClause = `wr.tenant_id = $1`;
    const params = [actor.tenantId];

    if (actor.role === 'MANAGER') {
        // Managers see PENDING requests from their reports + delegated reports
        whereClause += ` AND wr.status = 'PENDING' AND (e.reports_to = $2 OR e.reports_to IN (
            SELECT de.id FROM approval_delegations ad
            JOIN users du ON du.id = ad.delegator_id
            JOIN employees de ON de.user_id = du.id
            WHERE ad.tenant_id = $1 AND ad.delegate_id = $3
              AND ad.is_active = true
              AND ad.start_date <= CURRENT_DATE AND ad.end_date >= CURRENT_DATE
        ))`;
        params.push(actor.employeeId);
        params.push(actor.id);
    } else if (actor.role === 'HR' || actor.role === 'ADMIN') {
        // HR/Admin see PENDING_HR requests across the tenant
        whereClause += ` AND wr.status = 'PENDING_HR'`;
    } else {
        return [];
    }

    const result = await query(
        `SELECT wr.*, 
                e.first_name, e.last_name, u.email, e.employee_id as employee_code
         FROM wfh_requests wr
         JOIN employees e ON e.id = wr.employee_id
         JOIN users u ON u.id = e.user_id
         WHERE ${whereClause}
         ORDER BY wr.request_date ASC, wr.created_at ASC`,
        params
    );

    return result.rows;
};

/* ========================== APPROVE WFH REQUEST ========================== */
exports.approveWFH = async (db, requestId, actor, comment = null) => {
    const query = getQuery(db);

    // Get request details and verify permissions
    const requestRes = await query(
        `SELECT wr.*, e.reports_to 
         FROM wfh_requests wr
         JOIN employees e ON e.id = wr.employee_id
         WHERE wr.id = $1 AND wr.tenant_id = $2`,
        [requestId, actor.tenantId]
    );

    if (requestRes.rowCount === 0) {
        throw new Error("WFH request not found");
    }

    const request = requestRes.rows[0];

    // Authorization check
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can approve WFH requests");
    }

    if (request.employee_id === actor.employeeId) {
        throw new Error("You cannot approve your own WFH requests.");
    }

    // ---------------------------------------------------------
    // STAGE 1: MANAGER APPROVAL (PENDING -> PENDING_HR)
    // ---------------------------------------------------------
    if (request.status === 'PENDING') {
        const isDirectManager = request.reports_to === actor.employeeId;
        const isDelegateApprover = await delegationService.canApprove(query, actor.id,
            (await query(`SELECT user_id FROM employees WHERE id = $1`, [request.reports_to])).rows[0]?.user_id,
            actor.tenantId
        );

        if (!isDirectManager && !isDelegateApprover && actor.role !== 'ADMIN' && actor.role !== 'HR') {
            throw new Error("You can only approve WFH requests for your direct reports or as a delegate");
        }

        const result = await query(
            `UPDATE wfh_requests 
             SET status = 'PENDING_HR', 
                 manager_approved_by = $1, 
                 manager_approved_at = NOW(),
                 approval_comment = $2,
                 updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [actor.id, comment, requestId, actor.tenantId]
        );
        return result.rows[0];
    }

    // ---------------------------------------------------------
    // STAGE 2: HR APPROVAL (PENDING_HR -> APPROVED)
    // ---------------------------------------------------------
    if (request.status === 'PENDING_HR') {
        if (actor.role !== 'HR' && actor.role !== 'ADMIN') {
            throw new Error("Only HR or Admin can finalize this WFH request after manager approval.");
        }

        const result = await query(
            `UPDATE wfh_requests 
             SET status = 'APPROVED', 
                 approved_by = $1, 
                 approved_at = NOW(),
                 approval_comment = $2,
                 updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [actor.id, comment, requestId, actor.tenantId]
        );
        return result.rows[0];
    }

    throw new Error(`Cannot approve a WFH request with status: ${request.status}`);
};

/* ========================== REJECT WFH REQUEST ========================== */
exports.rejectWFH = async (db, requestId, actor, reason) => {
    const query = getQuery(db);

    if (!reason || reason.trim().length < 5) {
        throw new Error("Rejection reason is required (minimum 5 characters)");
    }

    // Get request details and verify permissions
    const requestRes = await query(
        `SELECT wr.*, e.reports_to 
         FROM wfh_requests wr
         JOIN employees e ON e.id = wr.employee_id
         WHERE wr.id = $1 AND wr.tenant_id = $2`,
        [requestId, actor.tenantId]
    );

    if (requestRes.rowCount === 0) {
        throw new Error("WFH request not found");
    }

    const request = requestRes.rows[0];

    // Authorization check
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can reject WFH requests");
    }

    if (request.employee_id === actor.employeeId) {
        throw new Error("You cannot reject your own WFH requests.");
    }

    // Logic: Managers can reject 'PENDING'. HR/Admin can reject 'PENDING' or 'PENDING_HR'.
    if (actor.role === 'MANAGER') {
        const isDirectManager = request.reports_to === actor.employeeId;
        const isDelegateApprover = await delegationService.canApprove(query, actor.id,
            (await query(`SELECT user_id FROM employees WHERE id = $1`, [request.reports_to])).rows[0]?.user_id,
            actor.tenantId
        );

        if (!isDirectManager && !isDelegateApprover) {
            throw new Error("You can only reject WFH requests for your direct reports or as a delegate");
        }
        if (request.status !== 'PENDING') {
            throw new Error(`You can only reject requests in PENDING status. This request is ${request.status}.`);
        }
    } else if (actor.role === 'HR' || actor.role === 'ADMIN') {
        if (request.status !== 'PENDING' && request.status !== 'PENDING_HR') {
            throw new Error(`Request is already ${request.status}.`);
        }
    }

    // Reject the request
    const result = await query(
        `UPDATE wfh_requests 
         SET status = 'REJECTED', 
             rejected_by = $1, 
             rejected_at = NOW(),
             rejection_reason = $2,
             updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4
         RETURNING *`,
        [actor.id, reason, requestId, actor.tenantId]
    );

    return result.rows[0];
};

/* ========================== CHECK WFH FOR DATE ========================== */
exports.checkWFHForDate = async (db, tenantId, employeeId, date) => {
    const query = getQuery(db);

    const result = await query(
        `SELECT * FROM wfh_requests 
         WHERE tenant_id = $1 
           AND employee_id = $2 
           AND request_date = $3
           AND status = 'APPROVED'
         LIMIT 1`,
        [tenantId, employeeId, date]
    );

    return result.rows[0] || null;
};

/* ========================== GET TEAM CAPACITY STATS ========================== */
exports.getTeamCapacityStats = async (db, actor, date) => {
    const query = getQuery(db);

    if (!actor.employeeId) {
        return { totalTeamSize: 0, approvedWFHCount: 0, approvedLeaveCount: 0 };
    }

    // 1. Get Total Team Size (Number of employees reporting to this manager)
    const teamRes = await query(
        `SELECT COUNT(*) as count 
         FROM employees 
         WHERE reports_to = $1 AND tenant_id = $2 AND is_active = true`,
        [actor.employeeId, actor.tenantId]
    );
    const totalTeamSize = parseInt(teamRes.rows[0].count || 0);

    if (totalTeamSize === 0) {
        return { totalTeamSize: 0, approvedWFHCount: 0, approvedLeaveCount: 0 };
    }

    // 2. Get Count of Approved WFH for the date (Team members only)
    const wfhRes = await query(
        `SELECT COUNT(*) as count 
         FROM wfh_requests wr
         JOIN employees e ON e.id = wr.employee_id
         WHERE wr.tenant_id = $1 
           AND wr.request_date = $2 
           AND wr.status = 'APPROVED'
           AND e.reports_to = $3`,
        [actor.tenantId, date, actor.employeeId]
    );
    const approvedWFHCount = parseInt(wfhRes.rows[0].count || 0);

    // 3. Get Count of Approved Leave for the date (Team members only)
    const leaveRes = await query(
        `SELECT COUNT(*) as count 
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         WHERE la.tenant_id = $1 
           AND la.status = 'APPROVED'
           AND $2::date BETWEEN la.start_date AND la.end_date
           AND e.reports_to = $3`,
        [actor.tenantId, date, actor.employeeId]
    );
    const approvedLeaveCount = parseInt(leaveRes.rows[0].count || 0);

    return {
        totalTeamSize,
        approvedWFHCount,
        approvedLeaveCount
    };
};
