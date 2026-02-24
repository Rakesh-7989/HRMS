const pool = require("../../../config/db");
const timeService = require("../../../utils/timeService");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ========================== GET EMPLOYEE BALANCES ========================== */
exports.getEmployeeBalances = async (db, employeeId, tenantId, year = null) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const targetYear = year || parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    const res = await query(
        `SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lb.year = $3
         ORDER BY lt.name ASC`,
        [tenantId, employeeId, targetYear]
    );

    return res.rows;
};

/* ========================== GET SPECIFIC BALANCE ========================== */
exports.getBalance = async (db, employeeId, leaveTypeId, tenantId, year = null, lock = false) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const targetYear = year || parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    const lockClause = lock ? ' FOR UPDATE' : '';

    const res = await query(
        `SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lb.leave_type_id = $3 AND lb.year = $4${lockClause}`,
        [tenantId, employeeId, leaveTypeId, targetYear]
    );

    return res.rows[0] || null;
};

/* ========================== INITIALIZE BALANCES ========================== */
exports.initializeBalances = async (db, employeeId, tenantId, joinDate = null) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const today = timeService.todayDate(tz);
    const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    const leaveTypes = await query(
        `SELECT id FROM leave_types WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
    );

    for (const lt of leaveTypes.rows) {
        const existing = await query(
            `SELECT id FROM leave_balances 
             WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [tenantId, employeeId, lt.id, currentYear]
        );

        if (existing.rowCount === 0) {
            await query(
                `INSERT INTO leave_balances 
                    (tenant_id, employee_id, leave_type_id, year, opening_balance, accrual_start_date)
                 VALUES ($1, $2, $3, $4, 0, $5)`,
                [tenantId, employeeId, lt.id, currentYear, joinDate || today]
            );
        }
    }

    return { success: true };
};

/* ========================== DEDUCT BALANCE ========================== */
exports.deductBalance = async (db, employeeId, leaveTypeId, days, tenantId, reason, actorId) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    let balance = await exports.getBalance(db, employeeId, leaveTypeId, tenantId, currentYear, true);

    if (!balance) {
        await exports.initializeBalances(db, employeeId, tenantId);
        balance = await exports.getBalance(db, employeeId, leaveTypeId, tenantId, currentYear);
    }

    if (!balance) {
        throw new Error("Could not find or create leave balance");
    }

    const previousBalance = parseFloat(balance.current_balance);

    await query(
        `UPDATE leave_balances SET used = used + $1, updated_at = now() WHERE id = $2`,
        [days, balance.id]
    );

    const updated = await query(
        `SELECT current_balance FROM leave_balances WHERE id = $1`,
        [balance.id]
    );

    await query(
        `INSERT INTO leave_balance_adjustments 
            (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
             previous_balance, new_balance, created_by)
         VALUES ($1, $2, $3, 'DEDUCT', $4, $5, $6, $7, $8)`,
        [
            tenantId, balance.id, employeeId, -days, reason,
            previousBalance, updated.rows[0].current_balance, actorId
        ]
    );

    return updated.rows[0];
};

/* ========================== RESTORE BALANCE ========================== */
exports.restoreBalance = async (db, employeeId, leaveTypeId, days, tenantId, reason, actorId) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, tenantId, employeeId);
    const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    const balance = await exports.getBalance(db, employeeId, leaveTypeId, tenantId, currentYear, true);

    if (!balance) {
        throw new Error("Leave balance not found");
    }

    const previousBalance = parseFloat(balance.current_balance);

    await query(
        `UPDATE leave_balances SET used = GREATEST(0, used - $1), updated_at = now() WHERE id = $2`,
        [days, balance.id]
    );

    const updated = await query(
        `SELECT current_balance FROM leave_balances WHERE id = $1`,
        [balance.id]
    );

    await query(
        `INSERT INTO leave_balance_adjustments 
            (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
             previous_balance, new_balance, created_by)
         VALUES ($1, $2, $3, 'GRANT', $4, $5, $6, $7, $8)`,
        [
            tenantId, balance.id, employeeId, days, reason,
            previousBalance, updated.rows[0].current_balance, actorId
        ]
    );

    return updated.rows[0];
};

/* ========================== MANUAL ADJUSTMENT ========================== */
exports.adjustBalance = async (db, employeeId, leaveTypeId, adjustment, reason, actor) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, actor.tenantId, employeeId);
    const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    let balance = await exports.getBalance(db, employeeId, leaveTypeId, actor.tenantId, currentYear);

    if (!balance) {
        await exports.initializeBalances(db, employeeId, actor.tenantId);
        balance = await exports.getBalance(db, employeeId, leaveTypeId, actor.tenantId, currentYear);
    }

    if (!balance) {
        throw new Error("Could not find or create leave balance");
    }

    const previousBalance = parseFloat(balance.current_balance);

    await query(
        `UPDATE leave_balances SET adjusted = adjusted + $1, updated_at = now() WHERE id = $2`,
        [adjustment, balance.id]
    );

    const updated = await query(
        `SELECT current_balance FROM leave_balances WHERE id = $1`,
        [balance.id]
    );

    await query(
        `INSERT INTO leave_balance_adjustments 
            (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
             previous_balance, new_balance, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            actor.tenantId, balance.id, employeeId,
            adjustment >= 0 ? 'GRANT' : 'DEDUCT',
            adjustment, reason,
            previousBalance, updated.rows[0].current_balance, actor.id
        ]
    );

    return {
        previous_balance: previousBalance,
        adjustment: adjustment,
        new_balance: parseFloat(updated.rows[0].current_balance)
    };
};

/* ========================== RESET ACCRUAL ========================== */
exports.resetAccrual = async (db, employeeId, newStartDate, actor) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, actor.tenantId, employeeId);
    const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    const balances = await query(
        `SELECT lb.id, lb.leave_type_id, lb.current_balance, lt.name AS leave_type_name
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lb.year = $3`,
        [actor.tenantId, employeeId, currentYear]
    );

    const results = [];

    for (const bal of balances.rows) {
        const previousBalance = parseFloat(bal.current_balance);

        await query(
            `UPDATE leave_balances 
             SET accrued = 0, accrual_start_date = $1, last_accrual_date = NULL, updated_at = now()
             WHERE id = $2`,
            [newStartDate, bal.id]
        );

        const updated = await query(
            `SELECT current_balance FROM leave_balances WHERE id = $1`,
            [bal.id]
        );

        await query(
            `INSERT INTO leave_balance_adjustments 
                (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
                 previous_balance, new_balance, created_by)
             VALUES ($1, $2, $3, 'RESET', 0, $4, $5, $6, $7)`,
            [
                actor.tenantId, bal.id, employeeId,
                `Accrual reset with new start date: ${newStartDate}`,
                previousBalance, updated.rows[0].current_balance, actor.id
            ]
        );

        results.push({
            leave_type: bal.leave_type_name,
            previous_balance: previousBalance,
            new_balance: parseFloat(updated.rows[0].current_balance)
        });
    }

    return { success: true, balances: results };
};

/* ========================== GET ADJUSTMENT HISTORY ========================== */
exports.getAdjustmentHistory = async (db, employeeId, tenantId, filters = {}) => {
    const query = getQuery(db);

    const params = [tenantId, employeeId];
    let where = `WHERE lba.tenant_id = $1 AND lba.employee_id = $2`;
    let i = 3;

    if (filters.leave_type_id) {
        where += ` AND lb.leave_type_id = $${i}`;
        params.push(filters.leave_type_id);
        i++;
    }

    if (filters.from_date) {
        where += ` AND lba.created_at >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        where += ` AND lba.created_at <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    const res = await query(
        `SELECT lba.*, lt.name AS leave_type_name, lt.code AS leave_type_code,
                u.email AS created_by_email
         FROM leave_balance_adjustments lba
         JOIN leave_balances lb ON lb.id = lba.balance_id
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         LEFT JOIN users u ON u.id = lba.created_by
         ${where}
         ORDER BY lba.created_at DESC
         LIMIT 100`,
        params
    );

    return res.rows;
};

/* ========================== BULK ALLOCATE ========================== */
exports.bulkAllocate = async (db, leaveTypeId, days, employeeIds, reason, actor, year = null) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, actor.tenantId);
    const targetYear = year || parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));
    const today = timeService.todayDate(tz);

    // If no specific employees, get all active employees
    let targetEmployees;
    if (employeeIds && employeeIds.length > 0) {
        targetEmployees = await query(
            `SELECT e.id as employee_id FROM employees e
             JOIN users u ON u.id = e.user_id
             WHERE e.tenant_id = $1 AND e.id = ANY($2) AND e.is_deleted = false`,
            [actor.tenantId, employeeIds]
        );
    } else {
        targetEmployees = await query(
            `SELECT e.id as employee_id FROM employees e
             JOIN users u ON u.id = e.user_id
             WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.is_deleted = false`,
            [actor.tenantId]
        );
    }

    let processed = 0;
    let failed = 0;

    for (const emp of targetEmployees.rows) {
        try {
            // Get or create balance for the specified year
            let balance = await exports.getBalance(db, emp.employee_id, leaveTypeId, actor.tenantId, targetYear);

            if (!balance) {
                // Create balance record for the specified year
                await query(
                    `INSERT INTO leave_balances 
                        (tenant_id, employee_id, leave_type_id, year, opening_balance, accrual_start_date)
                     VALUES ($1, $2, $3, $4, 0, $5)`,
                    [actor.tenantId, emp.employee_id, leaveTypeId, targetYear, today]
                );
                balance = await exports.getBalance(db, emp.employee_id, leaveTypeId, actor.tenantId, targetYear);
            }

            if (balance) {
                const previousBalance = parseFloat(balance.current_balance);

                // Add to adjusted column
                await query(
                    `UPDATE leave_balances SET adjusted = adjusted + $1, updated_at = now() WHERE id = $2`,
                    [days, balance.id]
                );

                const updated = await query(
                    `SELECT current_balance FROM leave_balances WHERE id = $1`,
                    [balance.id]
                );

                // Log adjustment
                await query(
                    `INSERT INTO leave_balance_adjustments 
                        (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
                         previous_balance, new_balance, created_by)
                     VALUES ($1, $2, $3, 'GRANT', $4, $5, $6, $7, $8)`,
                    [
                        actor.tenantId, balance.id, emp.employee_id,
                        days, reason || `Bulk Allocation for ${targetYear}`,
                        previousBalance, updated.rows[0].current_balance, actor.id
                    ]
                );

                processed++;
            } else {
                failed++;
            }
        } catch (err) {
            console.error(`Failed to allocate for employee ${emp.employee_id}:`, err);
            failed++;
        }
    }

    return { success: true, processed, failed, year: targetYear };
};

/* ========================== RESET BALANCES ========================== */
/**
 * Reset leave balances for employees
 * @param {Object} db - Database connection
 * @param {Object} options - Reset options
 * @param {string} options.employee_id - Optional: specific employee to reset (null for all)
 * @param {string} options.leave_type_id - Optional: specific leave type (null for all)
 * @param {number} options.year - Year to reset (defaults to current year)
 * @param {boolean} options.reset_to_zero - If true, set balance to 0. If false, reset used/pending only
 * @param {Object} actor - User performing the action
 */
exports.resetBalances = async (db, options, actor) => {
    const query = getQuery(db);
    const { employee_id, leave_type_id, year, reset_to_zero = true, reason } = options;
    const tz = await timeService.getEffectiveTz(query, actor.tenantId, employee_id);
    const targetYear = year || parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    let conditions = [`lb.tenant_id = $1`, `lb.year = $2`];
    let params = [actor.tenantId, targetYear];
    let paramIndex = 3;

    if (employee_id) {
        conditions.push(`lb.employee_id = $${paramIndex}`);
        params.push(employee_id);
        paramIndex++;
    }

    if (leave_type_id) {
        conditions.push(`lb.leave_type_id = $${paramIndex}`);
        params.push(leave_type_id);
        paramIndex++;
    }

    // Get all balances to reset
    const balancesRes = await query(
        `SELECT lb.*, lt.name as leave_type_name, e.first_name, e.last_name
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         JOIN employees e ON e.id = lb.employee_id
         WHERE ${conditions.join(' AND ')}`,
        params
    );

    if (balancesRes.rowCount === 0) {
        return { success: true, message: 'No balances found to reset', processed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const balance of balancesRes.rows) {
        try {
            const previousBalance = parseFloat(balance.current_balance);

            if (reset_to_zero) {
                // Reset everything to zero
                await query(
                    `UPDATE leave_balances 
                     SET opening_balance = 0, 
                         accrued = 0, 
                         adjustments = 0, 
                         used = 0, 
                         pending = 0,
                         carry_forward = 0,
                         updated_at = now()
                     WHERE id = $1`,
                    [balance.id]
                );
            } else {
                // Only reset used and pending (keep accrued/opening)
                await query(
                    `UPDATE leave_balances 
                     SET used = 0, 
                         pending = 0,
                         updated_at = now()
                     WHERE id = $1`,
                    [balance.id]
                );
            }

            const updated = await query(
                `SELECT current_balance FROM leave_balances WHERE id = $1`,
                [balance.id]
            );

            // Log the reset
            await query(
                `INSERT INTO leave_balance_adjustments 
                    (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
                     previous_balance, new_balance, created_by)
                 VALUES ($1, $2, $3, 'RESET', $4, $5, $6, $7, $8)`,
                [
                    actor.tenantId, balance.id, balance.employee_id,
                    -previousBalance, reason || `Leave balance reset for ${targetYear}`,
                    previousBalance, updated.rows[0].current_balance, actor.id
                ]
            );

            processed++;
        } catch (err) {
            console.error(`Failed to reset balance ${balance.id}:`, err);
            failed++;
        }
    }

    return {
        success: true,
        processed,
        failed,
        year: targetYear,
        message: `Reset ${processed} balance(s) for year ${targetYear}`
    };
};

/* ========================== BULK RESET BALANCES ========================== */
exports.bulkResetBalances = async (db, leave_type_id, employee_ids, reset_to_zero, reason, actor, year) => {
    const query = getQuery(db);
    const tz = await timeService.getEffectiveTz(query, actor.tenantId);
    const targetYear = year || parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(new Date()));

    let processed = 0;
    let failed = 0;

    const employeesToReset = employee_ids && employee_ids.length > 0
        ? employee_ids
        : (await query(
            `SELECT DISTINCT employee_id FROM leave_balances WHERE tenant_id = $1 AND year = $2`,
            [actor.tenantId, targetYear]
        )).rows.map(r => r.employee_id);

    for (const empId of employeesToReset) {
        try {
            const result = await exports.resetBalances(db, {
                employee_id: empId,
                leave_type_id,
                year: targetYear,
                reset_to_zero,
                reason
            }, actor);

            processed += result.processed;
            failed += result.failed;
        } catch (err) {
            console.error(`Failed to reset for employee ${empId}:`, err);
            failed++;
        }
    }

    return { success: true, processed, failed, year: targetYear };
};
