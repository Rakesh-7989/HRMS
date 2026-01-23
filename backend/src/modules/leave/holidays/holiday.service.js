const pool = require("../../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ========================== PUBLIC HOLIDAYS ========================== */

exports.createPublicHoliday = async (db, data, actor) => {
    const query = getQuery(db);
    const year = new Date(data.date).getFullYear();

    const existing = await query(
        `SELECT id FROM public_holidays WHERE tenant_id = $1 AND date = $2`,
        [actor.tenantId, data.date]
    );

    if (existing.rowCount > 0) {
        throw new Error(`Holiday already exists for ${data.date}`);
    }

    const res = await query(
        `INSERT INTO public_holidays 
            (tenant_id, name, date, year, is_paid, is_optional, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            actor.tenantId,
            data.name,
            data.date,
            year,
            data.is_paid !== false,
            data.is_optional || false,
            actor.id
        ]
    );

    return res.rows[0];
};

exports.getPublicHolidays = async (db, tenantId, year = null) => {
    const query = getQuery(db);
    const targetYear = year || new Date().getFullYear();

    const res = await query(
        `SELECT * FROM public_holidays 
         WHERE tenant_id = $1 AND year = $2
         ORDER BY date ASC`,
        [tenantId, targetYear]
    );

    return res.rows;
};

exports.deletePublicHoliday = async (db, id, actor) => {
    const query = getQuery(db);

    await query(
        `DELETE FROM public_holidays WHERE id = $1 AND tenant_id = $2`,
        [id, actor.tenantId]
    );

    return { success: true };
};

exports.uploadHolidaysCSV = async (db, csvData, actor) => {
    const query = getQuery(db);
    let created = 0;
    let skipped = 0;

    for (const row of csvData) {
        try {
            const date = row.date || row.Date;
            const name = row.name || row.Name || row.holiday || row.Holiday;
            const isPaid = row.is_paid !== 'false' && row.is_paid !== false;
            const isOptional = row.is_optional === 'true' || row.is_optional === true;

            if (!date || !name) {
                skipped++;
                continue;
            }

            const year = new Date(date).getFullYear();

            await query(
                `INSERT INTO public_holidays 
                    (tenant_id, name, date, year, is_paid, is_optional, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (tenant_id, date) 
                 DO UPDATE SET name = $2, is_paid = $5, is_optional = $6`,
                [actor.tenantId, name, date, year, isPaid, isOptional, actor.id]
            );
            created++;
        } catch (err) {
            skipped++;
        }
    }

    return { created, skipped };
};

exports.isHoliday = async (db, date, tenantId) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT id, name FROM public_holidays WHERE tenant_id = $1 AND date = $2`,
        [tenantId, date]
    );

    return res.rows[0] || null;
};

/* ========================== RESTRICTED (FLOATING) HOLIDAYS ========================== */

exports.createRestrictedHoliday = async (db, data, actor) => {
    const query = getQuery(db);
    const year = new Date(data.date).getFullYear();

    const res = await query(
        `INSERT INTO restricted_holidays 
            (tenant_id, name, date, year, description, max_claims, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            actor.tenantId,
            data.name,
            data.date,
            year,
            data.description || null,
            data.max_claims || null,
            actor.id
        ]
    );

    return res.rows[0];
};

exports.getRestrictedHolidays = async (db, tenantId, year = null) => {
    const query = getQuery(db);
    const targetYear = year || new Date().getFullYear();

    const res = await query(
        `SELECT * FROM restricted_holidays 
         WHERE tenant_id = $1 AND year = $2 AND is_active = true
         ORDER BY date ASC`,
        [tenantId, targetYear]
    );

    return res.rows;
};

exports.deleteRestrictedHoliday = async (db, id, actor) => {
    const query = getQuery(db);

    await query(
        `UPDATE restricted_holidays SET is_active = false WHERE id = $1 AND tenant_id = $2`,
        [id, actor.tenantId]
    );

    return { success: true };
};

exports.claimRestrictedHoliday = async (db, restrictedHolidayId, employeeId, actor) => {
    const query = getQuery(db);

    const holiday = await query(
        `SELECT * FROM restricted_holidays WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [restrictedHolidayId, actor.tenantId]
    );

    if (holiday.rowCount === 0) {
        throw new Error("Restricted holiday not found or inactive");
    }

    const rh = holiday.rows[0];

    if (rh.max_claims && rh.current_claims >= rh.max_claims) {
        throw new Error("Maximum claims reached for this holiday");
    }

    const existing = await query(
        `SELECT id FROM restricted_holiday_usage 
         WHERE tenant_id = $1 AND employee_id = $2 AND restricted_holiday_id = $3`,
        [actor.tenantId, employeeId, restrictedHolidayId]
    );

    if (existing.rowCount > 0) {
        throw new Error("You have already claimed this holiday");
    }

    await query(
        `INSERT INTO restricted_holiday_usage 
            (tenant_id, employee_id, restricted_holiday_id)
         VALUES ($1, $2, $3)`,
        [actor.tenantId, employeeId, restrictedHolidayId]
    );

    await query(
        `UPDATE restricted_holidays SET current_claims = current_claims + 1 WHERE id = $1`,
        [restrictedHolidayId]
    );

    return { success: true, holiday: rh.name };
};

exports.getEmployeeRestrictedHolidayUsage = async (db, employeeId, tenantId, year = null) => {
    const query = getQuery(db);
    const targetYear = year || new Date().getFullYear();

    const res = await query(
        `SELECT rhu.*, rh.name, rh.date, rh.description
         FROM restricted_holiday_usage rhu
         JOIN restricted_holidays rh ON rh.id = rhu.restricted_holiday_id
         WHERE rhu.tenant_id = $1 AND rhu.employee_id = $2 AND rh.year = $3`,
        [tenantId, employeeId, targetYear]
    );

    return res.rows;
};

exports.countWorkingDays = async (db, startDate, endDate, tenantId) => {
    const query = getQuery(db);

    const holidays = await query(
        `SELECT date FROM public_holidays 
         WHERE tenant_id = $1 AND date >= $2 AND date <= $3`,
        [tenantId, startDate, endDate]
    );

    const holidayDates = new Set(holidays.rows.map(h => h.date.toISOString().split('T')[0]));

    let workingDays = 0;
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            if (!holidayDates.has(dateStr)) {
                workingDays++;
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};
