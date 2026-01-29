const pool = require("../../config/db");
const logger = require("../../config/logger");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return db.query;
    return pool.query.bind(pool);
};

// CREATE SHIFT
exports.createShift = async (db, tenantId, data, creatorId) => {
    const query = getQuery(db);
    const { name, code, description, start_time, end_time, break_start_time, break_end_time, grace_period_minutes } = data;

    const result = await query(
        `
    INSERT INTO shifts (
      tenant_id, name, code, description, 
      start_time, end_time, 
      break_start_time, break_end_time, 
      grace_period_minutes, created_by, updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    RETURNING *
    `,
        [tenantId, name, code, description, start_time, end_time, break_start_time, break_end_time, grace_period_minutes, creatorId]
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
        updated_by = $10,
        updated_at = NOW()
    WHERE id = $11 AND tenant_id = $12
    RETURNING *
    `,
        [name, code, description, start_time, end_time, break_start_time, break_end_time, grace_period_minutes, is_active, updaterId, shiftId, tenantId]
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
        return { count: result.rowCount };
    }
};
