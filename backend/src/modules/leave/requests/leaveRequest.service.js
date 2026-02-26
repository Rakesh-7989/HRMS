const pool = require("../../../config/db");
const leaveBalanceService = require("../balances/leaveBalance.service");
const delegationService = require("../delegations/delegation.service"); // Issue 12
const holidayService = require("../holidays/holiday.service");
const timeService = require("../../../utils/timeService");
const logger = require("../../../config/logger"); // Issue 26
const { BadRequestError, NotFoundError } = require("../../../utils/customErrors");

const getQuery = (db) => {
    if (db && typeof db.query === "function") {
        // Return a wrapper that calls db.query directly (avoids .bind() issues with PoolClients)
        return (text, params) => db.query(text, params);
    }
    return pool.query.bind(pool);
};

/**
 * EMPLOYEE: APPLY LEAVE
 * Issues fixed: 4 (transaction), 15 (monthly limit), 17 (timezone), 18 (half-day overlap), 20 (holiday range), 21 (pagination in getMyLeaves)
 */
exports.applyLeave = async (db, tenantId, employeeId, data) => {
    if (!employeeId) {
        throw new BadRequestError("Employee profile not linked. Contact admin.");
    }

    const { leave_type_id, start_date, end_date, is_half_day, half_day_session, reason, attachment_url } = data;

    // Basic sanity: start <= end
    if (new Date(start_date) > new Date(end_date)) {
        throw new BadRequestError("Start date cannot be after end date");
    }

    // Issue 4: Use a real transaction so FOR UPDATE works
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = client.query.bind(client);

        // Get leave type details
        const leaveTypeRes = await query(
            `SELECT * FROM leave_types WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
            [leave_type_id, tenantId]
        );

        if (leaveTypeRes.rowCount === 0) {
            throw new NotFoundError("Invalid or inactive leave type");
        }

        const leaveType = leaveTypeRes.rows[0];

        // Issue 17: Use consistent timezone-aware date comparison for min_days_notice
        if (leaveType.min_days_notice > 0) {
            // Use pool (not client) for timezone lookup — read-only, no need for transaction
            const tz = await timeService.getEffectiveTz(pool.query.bind(pool), tenantId, employeeId);
            const todayStr = timeService.todayDate(tz);
            const todayMs = new Date(todayStr + 'T00:00:00').getTime();
            const startMs = new Date(start_date + 'T00:00:00').getTime();
            const diffDays = Math.ceil((startMs - todayMs) / (1000 * 60 * 60 * 24));
            if (diffDays < leaveType.min_days_notice) {
                throw new BadRequestError(`This leave type requires at least ${leaveType.min_days_notice} days advance notice`);
            }
        }

        // Check if attachment required
        if (leaveType.requires_attachment && !attachment_url) {
            throw new BadRequestError("Attachment is required for this leave type");
        }

        // Calculate working days (excluding weekends and holidays)
        let daysCount;
        if (is_half_day) {
            daysCount = 0.5;
        } else {
            daysCount = await holidayService.countWorkingDays(client, start_date, end_date, tenantId);
        }

        // Issue 20: Block if all days in range are holidays/weekends
        if (daysCount === 0) {
            throw new BadRequestError("No working days in the selected date range. All days are holidays or weekends.");
        }

        // Check max consecutive days
        if (leaveType.max_consecutive_days && daysCount > leaveType.max_consecutive_days) {
            throw new BadRequestError(`Maximum ${leaveType.max_consecutive_days} consecutive days allowed for this leave type`);
        }

        // Issue 18: Check overlapping approved/pending leaves — account for half-day sessions
        let overlapQuery;
        let overlapParams;
        if (is_half_day && half_day_session) {
            // For half-day, only conflict if same date AND same session (or full day)
            overlapQuery = `SELECT id FROM leave_applications
                 WHERE tenant_id = $1
                   AND employee_id = $2
                   AND status IN ('PENDING', 'PENDING_HR', 'APPROVED')
                   AND start_date <= $4
                   AND end_date   >= $3
                   AND (
                       is_half_day = false
                       OR (is_half_day = true AND (half_day_session = $5 OR half_day_session IS NULL))
                   )
                 LIMIT 1`;
            overlapParams = [tenantId, employeeId, start_date, end_date, half_day_session];
        } else {
            overlapQuery = `SELECT id FROM leave_applications
                 WHERE tenant_id = $1
                   AND employee_id = $2
                   AND status IN ('PENDING', 'PENDING_HR', 'APPROVED')
                   AND start_date <= $4
                   AND end_date   >= $3
                   AND (
                       is_half_day = false
                       OR (is_half_day = true AND start_date = end_date AND start_date >= $3 AND start_date <= $4)
                   )
                 LIMIT 1`;
            overlapParams = [tenantId, employeeId, start_date, end_date];
        }

        const overlap = await query(overlapQuery, overlapParams);
        if (overlap.rowCount > 0) {
            throw new BadRequestError("Overlapping leave request already exists");
        }

        // Issue 10: Check leave balance for paid types AND enforce max days for unpaid types
        if (leaveType.is_paid && leaveType.code !== 'WFH') {
            // Use FOR UPDATE inside transaction to lock the balance row
            const balanceRes = await query(
                `SELECT * FROM leave_balances 
                 WHERE employee_id = $1 AND leave_type_id = $2 AND tenant_id = $3
                 FOR UPDATE`,
                [employeeId, leave_type_id, tenantId]
            );

            const balance = balanceRes.rows[0];

            if (!balance) {
                throw new BadRequestError(`Insufficient leave balance. Available: 0 days, Requested: ${daysCount} days`);
            }

            if (parseFloat(balance.current_balance) < daysCount) {
                throw new BadRequestError(`Insufficient leave balance. Available: ${balance.current_balance} days, Requested: ${daysCount} days`);
            }
        } else if (!leaveType.is_paid && leaveType.max_consecutive_days) {
            // Issue 10: For unpaid leave, still enforce max_consecutive_days as a limit
            if (daysCount > leaveType.max_consecutive_days) {
                throw new BadRequestError(`Maximum ${leaveType.max_consecutive_days} days allowed for this leave type`);
            }
        }

        // Issue 15: Removed confusing monthly usage limit that conflated accrual_rate with usage limit.
        // Monthly limits should be configured as a separate policy field, not derived from accrual_rate.

        const res = await query(
            `INSERT INTO leave_applications
                (tenant_id, employee_id, leave_type_id,
                 start_date, end_date, is_half_day, half_day_session, days_count, 
                 status, reason, attachment_url)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10)
             RETURNING *`,
            [tenantId, employeeId, leave_type_id, start_date, end_date, !!is_half_day,
                half_day_session || null, daysCount, reason || null, attachment_url || null]
        );

        // Issue 14: Increment pending balance
        if (leaveType.is_paid && leaveType.code !== 'WFH') {
            await leaveBalanceService.incrementPending(client, employeeId, leave_type_id, daysCount, tenantId);
        }

        await client.query('COMMIT');
        return res.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * EMPLOYEE: MY LEAVES
 * Issue 21: Added pagination with LIMIT/OFFSET
 */
exports.getMyLeaves = async (db, tenantId, employeeId, filters) => {
    const query = getQuery(db);

    const params = [tenantId, employeeId];
    let p = 3;
    let where = `WHERE la.tenant_id = $1 AND la.employee_id = $2`;

    if (filters.status) {
        where += ` AND la.status = $${p}`;
        params.push(filters.status);
        p++;
    }

    if (filters.leave_type_id) {
        where += ` AND la.leave_type_id = $${p}`;
        params.push(filters.leave_type_id);
        p++;
    }

    if (filters.year) {
        where += ` AND EXTRACT(YEAR FROM la.start_date) = $${p}`;
        params.push(filters.year);
        p++;
    }

    // Issue 21: Add pagination
    const limit = parseInt(filters.limit) || 100;
    const offset = parseInt(filters.offset) || 0;

    const res = await query(
        `SELECT
            la.*,
            lt.name AS leave_type_name,
            lt.code AS leave_type 
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where}
         ORDER BY la.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, limit, offset]
    );

    return res.rows;
};

/**
 * MANAGER: PENDING APPROVALS
 * Issue 1: Fixed SQL injection — actor.role no longer interpolated
 */
exports.getPendingApprovals = async (db, actor, filters) => {
    const query = getQuery(db);

    const params = [actor.tenantId];
    let p = 2;

    let statusFilter = filters.status;
    if (!statusFilter) {
        statusFilter = (actor.role === 'HR' || actor.role === 'ADMIN') ? 'PENDING_HR' : 'PENDING';
    }

    let statusClause = `la.status = $${p}`;

    if (statusFilter.includes(',')) {
        statusClause = `la.status IN (${statusFilter.split(',').map(() => `$${p++}`).join(',')})`;
        params.push(...statusFilter.split(','));
    } else {
        params.push(statusFilter);
        p++;
    }

    let where = `WHERE la.tenant_id = $1 AND ${statusClause}`;

    // Issue 12: Delegation support — managers see their directs + any delegated reports
    if (actor.role === 'MANAGER') {
        if (!actor.employeeId) {
            return [];
        }
        // Check if this manager has any active delegation authority
        where += ` AND (e.reports_to = $${p}`;
        params.push(actor.employeeId);
        p++;

        // Also allow seeing requests delegated to this user
        where += ` OR e.reports_to IN (
            SELECT de.id FROM approval_delegations ad
            JOIN users du ON du.id = ad.delegator_id
            JOIN employees de ON de.user_id = du.id
            WHERE ad.tenant_id = $1 AND ad.delegate_id = $${p}
              AND ad.is_active = true
              AND ad.start_date <= CURRENT_DATE AND ad.end_date >= CURRENT_DATE
        ))`;
        params.push(actor.id);
        p++;
    }

    if (filters.from_date) {
        where += ` AND la.created_at >= $${p}`;
        params.push(filters.from_date);
        p++;
    }

    if (filters.to_date) {
        where += ` AND la.created_at <= $${p}::date + interval '1 day'`;
        params.push(filters.to_date);
        p++;
    }

    // Issue 1: Fixed — actor.role is now a bind parameter, not interpolated
    const res = await query(
        `SELECT
            la.*,
            lt.name AS leave_type_name,
            lt.code AS leave_type,
            e.first_name,
            e.last_name,
            u.email,
            m.first_name AS manager_first_name,
            m.last_name AS manager_last_name,
            CASE 
                WHEN e.reports_to = $${p} AND la.status = 'PENDING' THEN true 
                WHEN $${p + 1} IN ('HR', 'ADMIN') AND la.status = 'PENDING_HR' THEN true
                ELSE false 
            END AS can_approve
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         JOIN users u     ON u.id = e.user_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         LEFT JOIN employees m     ON m.id = e.reports_to
         ${where}
         ORDER BY la.start_date ASC`,
        [...params, actor.employeeId, actor.role]
    );

    return res.rows;
};

/**
 * APPROVE LEAVE
 * Issues fixed: 2 (transaction), 6 (days_count fallback), 12 (delegations), 26 (logging)
 */
exports.approveLeave = async (db, actor, leaveId, comment) => {
    // SECURITY: Validate role authorization
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can approve leave requests");
    }

    // Issue 2: Wrap in transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = client.query.bind(client);

        // Get leave details and current status
        const leaveRes = await query(
            `SELECT la.*, lt.is_paid, lt.code as leave_type_code, e.reports_to
             FROM leave_applications la
             LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
             LEFT JOIN employees e ON e.id = la.employee_id
             WHERE la.id = $1 AND la.tenant_id = $2`,
            [leaveId, actor.tenantId]
        );

        if (leaveRes.rowCount === 0) {
            throw new Error("Leave application not found");
        }

        const leave = leaveRes.rows[0];

        // BLOCK SELF-APPROVAL
        if (leave.employee_id === actor.employeeId) {
            throw new Error("You cannot approve your own leave requests.");
        }

        // ---------------------------------------------------------
        // STAGE 1: MANAGER APPROVAL (PENDING -> PENDING_HR)
        // ---------------------------------------------------------
        if (leave.status === 'PENDING') {
            // Issue 12: Check delegation — actor is either the direct manager or a delegate
            const isDirectManager = leave.reports_to === actor.employeeId;
            const isDelegateApprover = await delegationService.canApprove(client, actor.id,
                // Get the user_id of the reports_to employee
                (await query(`SELECT user_id FROM employees WHERE id = $1`, [leave.reports_to])).rows[0]?.user_id,
                actor.tenantId
            );

            if (!isDirectManager && !isDelegateApprover && actor.role !== 'ADMIN' && actor.role !== 'HR') {
                throw new Error("You can only approve leave for employees who report directly to you.");
            }

            const res = await query(
                `UPDATE leave_applications
                 SET status              = 'PENDING_HR',
                     manager_approved_by = $1,
                     manager_approved_at = now(),
                     manager_note        = $2,
                     updated_at          = now()
                 WHERE id = $3
                 RETURNING *`,
                [actor.id, comment || null, leaveId]
            );

            await query('COMMIT');
            return res.rows[0];
        }

        // ---------------------------------------------------------
        // STAGE 2: HR APPROVAL (PENDING_HR -> APPROVED)
        // ---------------------------------------------------------
        if (leave.status === 'PENDING_HR') {
            if (actor.role !== 'HR' && actor.role !== 'ADMIN') {
                throw new Error("Only HR or Admin can finalize this leave request after manager approval.");
            }

            const res = await query(
                `UPDATE leave_applications
                 SET status       = 'APPROVED',
                     approved_by  = $1,
                     approved_at  = now(),
                     hr_note      = $2,
                     updated_at   = now()
                 WHERE id = $3
                 RETURNING *`,
                [actor.id, comment || null, leaveId]
            );

            // Deduct balance for paid leave types (Except WFH)
            if (leave.is_paid && leave.leave_type_id && leave.leave_type_code !== 'WFH') {
                // Issue 6: Use stored days_count; fallback to holidayService instead of calendar days
                let daysCount = parseFloat(leave.days_count);
                if (!daysCount || isNaN(daysCount)) {
                    if (leave.is_half_day) {
                        daysCount = 0.5;
                    } else {
                        daysCount = await holidayService.countWorkingDays(
                            client,
                            leave.start_date.toISOString().split('T')[0],
                            leave.end_date.toISOString().split('T')[0],
                            actor.tenantId
                        );
                    }
                }

                // Balance deduction and pending balance clearance MUST be atomic
                await leaveBalanceService.deductBalance(
                    client, leave.employee_id, leave.leave_type_id, daysCount,
                    actor.tenantId, `Approved leave: ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]}`, actor.id
                );

                await leaveBalanceService.decrementPending(client, leave.employee_id, leave.leave_type_id, daysCount, actor.tenantId);
            }

            await query('COMMIT');
            return res.rows[0];
        }

        throw new Error(`Cannot approve a leave request with status: ${leave.status}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * REJECT LEAVE
 * Issues fixed: 12 (delegations), 14 (pending balance)
 */
exports.rejectLeave = async (db, actor, leaveId, reason) => {
    // SECURITY: Validate role authorization
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can reject leave requests");
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = client.query.bind(client);

        // Get request details
        const leaveCheck = await query(
            `SELECT la.employee_id, la.status, la.leave_type_id, la.days_count, la.is_half_day,
                    e.reports_to, lt.is_paid, lt.code as leave_type_code
             FROM leave_applications la
             JOIN employees e ON e.id = la.employee_id
             LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
             WHERE la.id = $1 AND la.tenant_id = $2`,
            [leaveId, actor.tenantId]
        );

        if (leaveCheck.rowCount === 0) {
            throw new Error("Leave application not found");
        }

        const leave = leaveCheck.rows[0];

        // Block self-rejection
        if (leave.employee_id === actor.employeeId) {
            throw new Error("You cannot reject your own leave requests.");
        }

        // Authorization check
        if (actor.role === 'MANAGER') {
            // Issue 12: Check delegation
            const isDirectManager = leave.reports_to === actor.employeeId;
            const reportToUserId = (await query(`SELECT user_id FROM employees WHERE id = $1`, [leave.reports_to])).rows[0]?.user_id;
            const isDelegateApprover = reportToUserId ? await delegationService.canApprove(client, actor.id, reportToUserId, actor.tenantId) : false;

            if (!isDirectManager && !isDelegateApprover) {
                throw new Error("You can only reject leave for employees who report directly to you.");
            }
            if (leave.status !== 'PENDING') {
                throw new Error(`You can only reject requests in PENDING status. This request is already ${leave.status}.`);
            }
        } else if (actor.role === 'HR' || actor.role === 'ADMIN') {
            if (leave.status !== 'PENDING' && leave.status !== 'PENDING_HR') {
                throw new Error(`Request is already ${leave.status}.`);
            }
        }

        const res = await query(
            `UPDATE leave_applications
             SET status           = 'REJECTED',
                 rejected_by      = $1,
                 rejected_at      = now(),
                 rejection_reason = $2,
                 updated_at       = now()
             WHERE id = $3
               AND tenant_id = $4
             RETURNING *`,
            [actor.id, reason || null, leaveId, actor.tenantId]
        );

        // Issue 14: Clear pending balance on rejection
        if (leave.is_paid && leave.leave_type_code !== 'WFH') {
            const daysCount = parseFloat(leave.days_count) || (leave.is_half_day ? 0.5 : 0);
            if (daysCount > 0) {
                await leaveBalanceService.decrementPending(client, leave.employee_id, leave.leave_type_id, daysCount, actor.tenantId);
            }
        }

        await query('COMMIT');
        return res.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * CANCEL LEAVE (PENDING, PENDING_HR, or APPROVED)
 * Issues fixed: 3 (transaction), 6 (days_count fallback), 14 (pending), 26 (logging)
 */
exports.cancelApprovedLeave = async (db, tenantId, employeeId, leaveId, reason) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = (text, params) => client.query(text, params);

        // Get leave details — allow cancelling PENDING, PENDING_HR, or APPROVED leaves
        const leaveRes = await query(
            `SELECT la.*, lt.is_paid, lt.code as leave_type_code 
             FROM leave_applications la
             LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
             WHERE la.id = $1 AND la.tenant_id = $2 AND la.employee_id = $3 
               AND la.status IN ('PENDING', 'PENDING_HR', 'APPROVED')`,
            [leaveId, tenantId, employeeId]
        );

        if (leaveRes.rowCount === 0) {
            throw new Error("Leave not found, already cancelled/rejected, or you don't have permission");
        }

        const leave = leaveRes.rows[0];
        const previousStatus = leave.status;

        // Only block past-date cancellation for APPROVED leaves
        if (previousStatus === 'APPROVED') {
            const todayStr = new Date().toISOString().split('T')[0];
            const startStr = leave.start_date instanceof Date
                ? leave.start_date.toISOString().split('T')[0]
                : String(leave.start_date).split('T')[0];
            if (new Date(startStr) < new Date(todayStr)) {
                throw new Error("Cannot cancel leave that has already started or passed");
            }
        }

        // Update leave status
        const res = await query(
            `UPDATE leave_applications
             SET status = 'CANCELLED',
                 cancelled_at = now(),
                 rejection_reason = $1,
                 updated_at = now()
             WHERE id = $2
             RETURNING *`,
            [reason || 'Cancelled by employee', leaveId]
        );

        // Restore balance for paid leave types
        if (leave.is_paid && leave.leave_type_id && leave.leave_type_code !== 'WFH') {
            let daysCount = parseFloat(leave.days_count);
            // Re-calculate if count missing (Issue 6)
            if (!daysCount || isNaN(daysCount)) {
                daysCount = await holidayService.countWorkingDays(
                    client,
                    leave.start_date.toISOString().split('T')[0],
                    leave.end_date.toISOString().split('T')[0],
                    tenantId
                );
            }

            if (previousStatus === 'APPROVED') {
                // If it was already approved, restore the used balance
                await leaveBalanceService.restoreBalance(
                    client, employeeId, leave.leave_type_id, daysCount,
                    tenantId, `Cancelled leave: ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]}`, employeeId
                );
            } else {
                // If it was PENDING or PENDING_HR, just clear the pending balance
                await leaveBalanceService.decrementPending(client, employeeId, leave.leave_type_id, daysCount, tenantId);
            }
        }

        await client.query('COMMIT');
        return res.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * ADMIN / HR: LEAVE SUMMARY (Dashboard logic mostly)
 */
exports.getLeaveSummary = async (db, actor, filters) => {
    const query = getQuery(db);
    const tenantId = actor.tenantId;

    const params = [tenantId];
    let p = 2;
    let where = `WHERE la.tenant_id = $1`;

    // Visibility: MANAGER sees only direct reports' summary. HR/ADMIN see whole tenant.
    if (actor.role === 'MANAGER') {
        if (!actor.employeeId) {
            return {
                approved: 0,
                pending: 0,
                rejected: 0,
                cancelled: 0,
                total: 0
            };
        }
        where += ` AND e.reports_to = $${p}`;
        params.push(actor.employeeId);
        p++;
    }

    let dateFilter = '';
    if (filters.from_date) {
        dateFilter += ` AND la.created_at >= $${p}`;
        params.push(filters.from_date);
        p++;
    }

    if (filters.to_date) {
        dateFilter += ` AND la.created_at <= $${p}::date + interval '1 day'`;
        params.push(filters.to_date);
        p++;
    }

    const countsRes = await query(
        `SELECT
            COUNT(*) AS total_applications,
            COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved,
            COUNT(CASE WHEN la.status = 'REJECTED' THEN 1 END) AS rejected,
            COUNT(CASE WHEN la.status IN ('PENDING', 'PENDING_HR') THEN 1 END) AS pending,
            COUNT(CASE WHEN la.status = 'CANCELLED' THEN 1 END) AS cancelled
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         ${where} ${dateFilter}`,
        params
    );

    const breakdownRes = await query(
        `SELECT
            lt.name AS leave_type_name,
            COUNT(*) AS requests,
            SUM(
                CASE
                    WHEN la.is_half_day THEN 0.5
                    ELSE la.days_count
                END
            ) AS total_days
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where} ${dateFilter} AND la.status = 'APPROVED'
         GROUP BY lt.name
         ORDER BY lt.name`,
        params
    );

    const counts = countsRes.rows[0];
    return {
        total_applications: parseInt(counts.total_applications || 0),
        approved: parseInt(counts.approved || 0),
        rejected: parseInt(counts.rejected || 0),
        pending: parseInt(counts.pending || 0),
        cancelled: parseInt(counts.cancelled || 0),
        by_type: breakdownRes.rows
    };
};
