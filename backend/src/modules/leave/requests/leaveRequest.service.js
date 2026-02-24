const pool = require("../../../config/db");
const leaveBalanceService = require("../balances/leaveBalance.service");
// const leavePolicyService = require("../policies/leavePolicy.service"); // Not strictly needed if validation logic matches
const holidayService = require("../holidays/holiday.service");
const timeService = require("../../../utils/timeService");
const { BadRequestError, NotFoundError } = require("../../../utils/customErrors");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/**
 * EMPLOYEE: APPLY LEAVE
 */
exports.applyLeave = async (db, tenantId, employeeId, data) => {
    const query = getQuery(db);

    if (!employeeId) {
        throw new BadRequestError("Employee profile not linked. Contact admin.");
    }

    const { leave_type_id, start_date, end_date, is_half_day, half_day_session, reason, attachment_url } = data;

    // Basic sanity: start <= end
    if (new Date(start_date) > new Date(end_date)) {
        throw new BadRequestError("Start date cannot be after end date");
    }

    // Get leave type details
    const leaveTypeRes = await query(
        `SELECT * FROM leave_types WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [leave_type_id, tenantId]
    );

    if (leaveTypeRes.rowCount === 0) {
        throw new NotFoundError("Invalid or inactive leave type");
    }

    const leaveType = leaveTypeRes.rows[0];

    // Check min days notice
    if (leaveType.min_days_notice > 0) {
        const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
        const todayStr = timeService.todayDate(tz);
        const today = new Date(todayStr); // Start of day in tenant timezone
        const startDateObj = new Date(start_date);
        const diffDays = Math.ceil((startDateObj - today) / (1000 * 60 * 60 * 24));
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
        daysCount = await holidayService.countWorkingDays(db, start_date, end_date, tenantId);
    }

    // Check max consecutive days
    if (leaveType.max_consecutive_days && daysCount > leaveType.max_consecutive_days) {
        throw new BadRequestError(`Maximum ${leaveType.max_consecutive_days} consecutive days allowed for this leave type`);
    }

    // Check overlapping approved/pending leaves
    const overlap = await query(
        `SELECT id FROM leave_applications
         WHERE tenant_id = $1
           AND employee_id = $2
           AND status IN ('PENDING', 'APPROVED')
           AND start_date <= $4
           AND end_date   >= $3
         LIMIT 1`,
        [tenantId, employeeId, start_date, end_date]
    );

    if (overlap.rowCount > 0) {
        throw new BadRequestError("Overlapping leave request already exists");
    }

    // Check if applying on a public holiday
    const holiday = await holidayService.isHoliday(db, start_date, tenantId);
    if (holiday && !is_half_day) {
        throw new BadRequestError(`Cannot apply leave on ${holiday.name} - it's a public holiday`);
    }

    // Check leave balance (for paid leave types) with row lock to prevent race condition
    // SKIP check for WFH (Work From Home) as it doesn't consume balance
    if (leaveType.is_paid && leaveType.code !== 'WFH') {
        // Use FOR UPDATE to lock the balance row and prevent concurrent modifications
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
    }

    // Check monthly usage limit (accrual_rate from policy acts as monthly limit)
    const policyRes = await query(
        `SELECT lp.accrual_rate, lp.accrual_type, lp.name as policy_name
         FROM leave_policies lp
         WHERE lp.tenant_id = $1 
           AND lp.leave_type_id = $2 
           AND lp.is_active = true
         ORDER BY lp.priority ASC
         LIMIT 1`,
        [tenantId, leave_type_id]
    );

    if (policyRes.rowCount > 0) {
        const policy = policyRes.rows[0];
        const monthlyLimit = parseFloat(policy.accrual_rate);

        if (monthlyLimit > 0 && policy.accrual_type === 'MONTHLY') {
            // Get start and end of the month(s) covered by this leave
            const startDateObj = new Date(start_date);
            const endDateObj = new Date(end_date);

            // Check each month the leave spans
            const monthsToCheck = new Set();
            let currentDate = new Date(startDateObj);
            while (currentDate <= endDateObj) {
                const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
                monthsToCheck.add(monthKey);
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1);
            }

            for (const monthKey of monthsToCheck) {
                const [year, month] = monthKey.split('-').map(Number);
                const monthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];

                // Calculate days in this month for current application
                const appStartInMonth = new Date(Math.max(startDateObj.getTime(), new Date(monthStart).getTime()));
                const appEndInMonth = new Date(Math.min(endDateObj.getTime(), new Date(monthEnd).getTime()));

                let requestedDaysInMonth = 0;
                if (is_half_day) {
                    // Half day is only for single day, so it's either in this month or not
                    if (startDateObj >= new Date(monthStart) && startDateObj <= new Date(monthEnd)) {
                        requestedDaysInMonth = 0.5;
                    }
                } else {
                    // Count working days in this month portion
                    requestedDaysInMonth = await holidayService.countWorkingDays(
                        db,
                        appStartInMonth.toISOString().split('T')[0],
                        appEndInMonth.toISOString().split('T')[0],
                        tenantId
                    );
                }

                // Get already approved/pending leaves in this month for this leave type
                const existingLeavesRes = await query(
                    `SELECT COALESCE(SUM(
                        CASE 
                            WHEN is_half_day THEN 0.5
                            ELSE days_count
                        END
                    ), 0) as used_days
                     FROM leave_applications
                     WHERE tenant_id = $1
                       AND employee_id = $2
                       AND leave_type_id = $3
                       AND status IN ('PENDING', 'APPROVED')
                       AND (
                           (start_date >= $4 AND start_date <= $5)
                           OR (end_date >= $4 AND end_date <= $5)
                           OR (start_date <= $4 AND end_date >= $5)
                       )`,
                    [tenantId, employeeId, leave_type_id, monthStart, monthEnd]
                );

                const alreadyUsedInMonth = parseFloat(existingLeavesRes.rows[0].used_days) || 0;
                const totalAfterApplication = alreadyUsedInMonth + requestedDaysInMonth;

                if (totalAfterApplication > monthlyLimit) {
                    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
                    throw new BadRequestError(
                        `Monthly limit exceeded for ${monthName} ${year}. ` +
                        `Limit: ${monthlyLimit} days, Already used: ${alreadyUsedInMonth} days, ` +
                        `Requested: ${requestedDaysInMonth} days. Available: ${(monthlyLimit - alreadyUsedInMonth).toFixed(1)} days.`
                    );
                }
            }
        }
    }

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

    return res.rows[0];
};

/**
 * EMPLOYEE: MY LEAVES
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

    const res = await query(
        `SELECT
            la.*,
            lt.name AS leave_type_name,
            lt.code AS leave_type 
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         ${where}
         ORDER BY la.created_at DESC`,
        params
    );

    return res.rows;
};

/**
 * MANAGER: PENDING APPROVALS
 */
exports.getPendingApprovals = async (db, actor, filters) => {
    const query = getQuery(db);

    const params = [actor.tenantId];
    let p = 2;

    // Default to PENDING if status not provided, otherwise allow filtering by specific status
    let statusFilter = filters.status || 'PENDING';
    let statusClause = `la.status = $${p}`;

    if (statusFilter.includes(',')) {
        statusClause = `la.status IN (${statusFilter.split(',').map(() => `$${p++}`).join(',')})`;
        params.push(...statusFilter.split(','));
    } else {
        params.push(statusFilter);
        p++;
    }

    let where = `WHERE la.tenant_id = $1 AND ${statusClause}`;

    // Visibility Logic: 
    // - MANAGERS only see their direct reports.
    // - HR and ADMIN can see all pending requests in the organization (visibility only).
    // Note: The actual Approve/Reject action is still strictly protected in the approveLeave/rejectLeave functions.
    if (actor.role === 'MANAGER') {
        if (!actor.employeeId) {
            return [];
        }
        where += ` AND e.reports_to = $${p}`;
        params.push(actor.employeeId);
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
            CASE WHEN e.reports_to = $${p} THEN true ELSE false END AS can_approve
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         JOIN users u     ON u.id = e.user_id
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         LEFT JOIN employees m     ON m.id = e.reports_to
         ${where}
         ORDER BY la.start_date ASC`,
        [...params, actor.employeeId]
    );

    return res.rows;
};

/**
 * APPROVE LEAVE
 * Security: Only ADMIN, HR, or MANAGER can approve
 * Managers can only approve their direct reports' leaves
 */
exports.approveLeave = async (db, actor, leaveId, comment) => {
    const query = getQuery(db);

    // SECURITY FIX: Validate role authorization
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can approve leave requests");
    }

    // Get leave details first
    const leaveRes = await query(
        `SELECT la.*, lt.is_paid, lt.code as leave_type_code, e.reports_to
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         LEFT JOIN employees e ON e.id = la.employee_id
         WHERE la.id = $1 AND la.tenant_id = $2 AND la.status = 'PENDING'`,
        [leaveId, actor.tenantId]
    );

    if (leaveRes.rowCount === 0) {
        throw new Error("Leave not found or already processed");
    }

    const leave = leaveRes.rows[0];

    // STRICT HIERARCHY: Verify reporter-manager relationship for all roles
    // Block self-approval
    if (leave.employee_id === actor.employeeId) {
        throw new Error("You cannot approve your own leave requests. Your reporting manager must do this.");
    }
    // Verify direct report relationship
    if (leave.reports_to !== actor.employeeId) {
        throw new Error("You can only approve leave for employees who report directly to you.");
    }

    // Update leave status
    const res = await query(
        `UPDATE leave_applications
         SET status       = 'APPROVED',
             approved_by  = $1,
             approved_at  = now(),
             manager_note = $2,
             updated_at   = now()
         WHERE id = $3
         RETURNING *`,
        [actor.id, comment || null, leaveId]
    );

    // Deduct balance for paid leave types (Except WFH)
    if (leave.is_paid && leave.leave_type_id && leave.leave_type_code !== 'WFH') {
        const daysCount = leave.days_count ||
            (leave.is_half_day ? 0.5 :
                Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1);

        try {
            await leaveBalanceService.deductBalance(
                db, leave.employee_id, leave.leave_type_id, daysCount,
                actor.tenantId, `Approved leave: ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]}`, actor.id
            );
        } catch (err) {
            console.warn("Could not deduct balance:", err.message);
        }
    }

    return res.rows[0];
};

/**
 * REJECT LEAVE
 * Security: Only ADMIN, HR, or MANAGER can reject
 * Managers can only reject their direct reports' leaves
 */
exports.rejectLeave = async (db, actor, leaveId, reason) => {
    const query = getQuery(db);

    // SECURITY FIX: Validate role authorization
    const allowedRoles = ['ADMIN', 'HR', 'MANAGER'];
    if (!allowedRoles.includes(actor.role)) {
        throw new Error("Unauthorized: Only Admin, HR, or Managers can reject leave requests");
    }

    // For managers, verify the employee reports to them
    const leaveCheck = await query(
        `SELECT la.employee_id, e.reports_to 
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         WHERE la.id = $1 AND la.tenant_id = $2`,
        [leaveId, actor.tenantId]
    );

    if (leaveCheck.rowCount > 0) {
        const leave = leaveCheck.rows[0];
        if (leave.employee_id === actor.employeeId) {
            throw new Error("You cannot reject your own leave requests.");
        }
        if (leave.reports_to !== actor.employeeId) {
            throw new Error("You can only reject leave for employees who report directly to you.");
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
           AND status = 'PENDING'
         RETURNING *`,
        [actor.id, reason || null, leaveId, actor.tenantId]
    );

    if (res.rowCount === 0) {
        throw new Error("Leave not found or already processed");
    }

    return res.rows[0];
};

/**
 * CANCEL APPROVED LEAVE
 */
exports.cancelApprovedLeave = async (db, tenantId, employeeId, leaveId, reason) => {
    const query = getQuery(db);

    // Get leave details
    const leaveRes = await query(
        `SELECT la.*, lt.is_paid, lt.code as leave_type_code 
         FROM leave_applications la
         LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
         WHERE la.id = $1 AND la.tenant_id = $2 AND la.employee_id = $3 AND la.status = 'APPROVED'`,
        [leaveId, tenantId, employeeId]
    );

    if (leaveRes.rowCount === 0) {
        throw new Error("Approved leave not found or you don't have permission to cancel it");
    }

    const leave = leaveRes.rows[0];

    // Cannot cancel past leaves
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const todayStr = timeService.todayDate(tz);
    if (new Date(leave.start_date) < new Date(todayStr)) {
        throw new Error("Cannot cancel leave that has already started or passed");
    }

    // Update leave status
    const res = await query(
        `UPDATE leave_applications
         SET status = 'CANCELLED',
             cancelled_at = now(),
             cancelled_by = (SELECT id FROM users WHERE tenant_id = $1 AND id = (SELECT user_id FROM employees WHERE id = $2)),
             rejection_reason = $3,
             updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [tenantId, employeeId, reason || 'Cancelled by employee', leaveId]
    );

    // Restore balance for paid leave types (Except WFH)
    if (leave.is_paid && leave.leave_type_id && leave.leave_type_code !== 'WFH') {
        const daysCount = leave.days_count ||
            (leave.is_half_day ? 0.5 :
                Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1);

        try {
            await leaveBalanceService.restoreBalance(
                db, employeeId, leave.leave_type_id, daysCount,
                tenantId, `Cancelled approved leave: ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]}`, null
            );
        } catch (err) {
            console.warn("Could not restore balance:", err.message);
        }
    }

    return res.rows[0];
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
        // Adjust to include the end of the day
        dateFilter += ` AND la.created_at <= $${p}::date + interval '1 day'`;
        params.push(filters.to_date);
        p++;
    }

    // Get overall counts based on creation date for the period
    const countsRes = await query(
        `SELECT
            COUNT(*) AS total_applications,
            COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved,
            COUNT(CASE WHEN la.status = 'REJECTED' THEN 1 END) AS rejected,
            COUNT(CASE WHEN la.status = 'PENDING' THEN 1 END) AS pending,
            COUNT(CASE WHEN la.status = 'CANCELLED' THEN 1 END) AS cancelled
         FROM leave_applications la
         JOIN employees e ON e.id = la.employee_id
         ${where} ${dateFilter}`,
        params
    );

    // Get breakdown by type for approved leaves in this period
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
