const pool = require("../../config/db");
const logger = require("../../config/logger");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const inboxService = require("../inbox/inbox.service");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return db.query.bind(db);
    return pool.query.bind(pool);
};

// CREATE SHIFT
exports.createShift = async (db, tenantId, data, creatorId) => {
    const query = getQuery(db);
    const { name, code, description, start_time, end_time, break_start_time, break_end_time, grace_period_minutes } = data;

    if (!code) throw new BadRequestError("Shift Code is required.");

    // Validate Break Times (Mandatory)
    if (!break_start_time) throw new BadRequestError("Break Start Time is required.");
    if (!break_end_time) throw new BadRequestError("Break End Time is required.");

    if (break_start_time >= break_end_time) {
        // Basic check, might need more robust time comparison if crossing midnight
        // For now, assuming breaks are within the same day or handled by frontend validation too
        // throw new BadRequestError("Break Start Time must be before Break End Time."); 
    }

    if (grace_period_minutes !== undefined && grace_period_minutes < 0) {
        throw new BadRequestError("Grace Period cannot be negative.");
    }
    // 1. Validate Uniqueness (Name, Code, Time Slot)
    const existing = await query(
        `SELECT name, code, start_time::text, end_time::text FROM shifts 
         WHERE tenant_id = $1 
         AND (name = $2 OR code = $3 OR (start_time::time = $4::time AND end_time::time = $5::time))`,
        [tenantId, name, code, start_time, end_time]
    );

    if (existing.rowCount > 0) {
        for (const found of existing.rows) {
            if (found.name === name) throw new BadRequestError(`Shift with name '${name}' already exists.`);
            if (found.code === code) throw new BadRequestError(`Shift with code '${code}' already exists.`);

            // Normalize times to HH:mm for comparison (handles 09:30 vs 09:30:00)
            const dbStart = found.start_time.substring(0, 5);
            const inputStart = start_time.substring(0, 5);
            const dbEnd = found.end_time.substring(0, 5);
            const inputEnd = end_time.substring(0, 5);

            if (dbStart === inputStart && dbEnd === inputEnd) {
                throw new BadRequestError(`A shift with the same timing (${formatTime(start_time)} - ${formatTime(end_time)}) already exists.`);
            }
        }
    }

    // Helper to format time for error message
    function formatTime(t) { return t.substring(0, 5); }

    const result = await query(
        `
    INSERT INTO shifts (
      tenant_id, name, code, description, 
      start_time, end_time, 
      break_start_time, break_end_time, 
      grace_period_minutes, 
      work_hours, half_day_threshold_hours, week_offs, overtime_enabled,
      created_by, updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
    RETURNING *
    `,
        [
            tenantId, name, code, description,
            start_time, end_time,
            break_start_time, break_end_time,
            grace_period_minutes,
            data.work_hours, // Default to 9 if not provided
            data.half_day_threshold_hours, // Default to 4
            data.week_offs || null, // Default to null (no week offs by default)
            data.overtime_enabled || false,
            creatorId
        ]
    );
    return result.rows[0];
};

// GET ALL SHIFTS
exports.getShifts = async (db, tenantId) => {
    const query = getQuery(db);
    const result = await query(
        `SELECT * FROM shifts WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return result.rows;
};

// GET SHIFT BY ID
exports.getShiftById = async (db, tenantId, shiftId) => {
    const query = getQuery(db);
    const result = await query(
        `SELECT * FROM shifts WHERE id = $1 AND tenant_id = $2`,
        [shiftId, tenantId]
    );
    return result.rows[0];
};

// UPDATE SHIFT
exports.updateShift = async (db, tenantId, shiftId, data, updaterId) => {
    const query = getQuery(db);
    const { name, code, description, start_time, end_time, break_start_time, break_end_time, grace_period_minutes, is_active } = data;

    // 1. Validate Uniqueness (Name, Code, Time Slot)
    if (grace_period_minutes !== undefined && grace_period_minutes < 0) {
        throw new BadRequestError("Grace Period cannot be negative.");
    }
    if (name || code || (start_time && end_time)) {
        // Build dynamic check? For simplicity, we fetch all potentially conflicting shifts
        // Note: Logic here is tricky if only one field is updated. 
        // We should ideally fetch the current shift first to get missing fields if we want "strict combination" check.
        // Assuming full object or partial updates. Let's do a robust check.

        // Get current shift state to fill in blanks for strict time check
        const currentShiftRes = await query(`SELECT * FROM shifts WHERE id=$1 AND tenant_id=$2`, [shiftId, tenantId]);
        if (currentShiftRes.rowCount === 0) throw new NotFoundError("Shift not found.");
        const currentShift = currentShiftRes.rows[0];

        const checkName = name || currentShift.name;
        const checkCode = code || currentShift.code;
        const checkStart = start_time || currentShift.start_time;
        const checkEnd = end_time || currentShift.end_time;

        const existing = await query(
            `SELECT id, name, code, start_time::text, end_time::text FROM shifts 
             WHERE tenant_id = $1 
             AND id != $2
             AND (name = $3 OR code = $4 OR (start_time::time = $5::time AND end_time::time = $6::time))`,
            [tenantId, shiftId, checkName, checkCode, checkStart, checkEnd]
        );

        if (existing.rowCount > 0) {
            for (const found of existing.rows) {
                if (found.name === checkName) throw new BadRequestError(`Shift with name '${checkName}' already exists.`);
                if (found.code === checkCode) throw new BadRequestError(`Shift with code '${checkCode}' already exists.`);

                const dbStart = found.start_time.substring(0, 5);
                const inputStart = checkStart.substring(0, 5);
                const dbEnd = found.end_time.substring(0, 5);
                const inputEnd = checkEnd.substring(0, 5);

                if (dbStart === inputStart && dbEnd === inputEnd) {
                    throw new BadRequestError(`A shift with the same timing (${inputStart} - ${inputEnd}) already exists.`);
                }
            }
        }
    }

    const result = await query(
        `
    UPDATE shifts
    SET name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        break_start_time = COALESCE($6, break_start_time),
        break_end_time = COALESCE($7, break_end_time),
        grace_period_minutes = COALESCE($8, grace_period_minutes),
        is_active = COALESCE($9, is_active),
        work_hours = COALESCE($10, work_hours),
        half_day_threshold_hours = COALESCE($11, half_day_threshold_hours),
        week_offs = COALESCE($12, week_offs),
        overtime_enabled = COALESCE($13, overtime_enabled),
        updated_by = $14,
        updated_at = NOW()
    WHERE id = $15 AND tenant_id = $16
    RETURNING *
    `,
        [
            data.name, data.code, data.description,
            data.start_time, data.end_time,
            data.break_start_time, data.break_end_time,
            data.grace_period_minutes,
            data.is_active,
            data.work_hours,
            data.half_day_threshold_hours,
            data.week_offs,
            data.overtime_enabled,
            updaterId, shiftId, tenantId
        ]
    );
    return result.rows[0];
};

// DELETE SHIFT (Soft delete or hard delete? Usually soft delete or blocked if used)
exports.deleteShift = async (db, tenantId, shiftId) => {
    const query = getQuery(db);
    const result = await query(
        `DELETE FROM shifts WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [shiftId, tenantId]
    );
    return result.rows[0];
};

// ASSIGN SHIFT TO EMPLOYEES
exports.assignShiftToEmployees = async (db, tenantId, shiftId, employeeIds, assignToAll) => {
    const query = getQuery(db);

    if (assignToAll) {
        // Assign to ALL employees in the tenant
        const result = await query(
            `UPDATE employees 
             SET shift_id = $1 
             WHERE tenant_id = $2 
             RETURNING id`,
            [shiftId, tenantId]
        );
        return { count: result.rowCount };
    } else {
        // Assign to specific employees
        if (!employeeIds || employeeIds.length === 0) return { count: 0 };

        const result = await query(
            `UPDATE employees 
             SET shift_id = $1 
             WHERE tenant_id = $2 AND id = ANY($3::uuid[]) 
             RETURNING id`,
            [shiftId, tenantId, employeeIds]
        );
        const assignResult = { count: result.rowCount };

        // Notify assigned employees
        try {
            const shiftRes = await pool.query(`SELECT name FROM shifts WHERE id = $1`, [shiftId]);
            const shiftName = shiftRes.rows[0]?.name || 'new shift';
            for (const row of result.rows) {
                const empUserRes = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [row.id]);
                if (empUserRes.rows[0]) {
                    await inboxService.createNotification(pool, {
                        tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
                        title: 'Shift Assigned',
                        message: `You have been assigned to the '${shiftName}' shift.`,
                        type: 'info', link: '/organization/shifts'
                    });
                }
            }
        } catch (notifErr) {
            console.error('Shift assign notification error:', notifErr.message);
        }

        return assignResult;
    }
};
