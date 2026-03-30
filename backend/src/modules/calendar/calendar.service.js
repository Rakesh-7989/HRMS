const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return db.query;
    return pool.query.bind(pool);
};

exports.getCalendar = async (db, tenantId, month, year, state) => {
    const query = getQuery(db);

    // 1. Generate all days for the month dynamically (works for ANY year)
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysInMonth = new Date(year, month, 0).getDate();
    const generatedDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayName = daysOfWeek[dateObj.getDay()];
        const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
        generatedDays.push({
            date_str: dateStr,
            day: dayName,
            is_weekend: isWeekend ? 'Yes' : 'No',
            holiday_name: isWeekend ? 'Weekend' : null,
            holiday_type: isWeekend ? 'Weekend' : null
        });
    }

    // 2. Fetch Central/National holidays from base_calendar (if they exist for this year)
    const baseRes = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, holiday_name, holiday_type 
         FROM base_calendar 
         WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
           AND holiday_type = 'Central'
         ORDER BY date ASC`,
        [month, year]
    );
    const centralHolidays = baseRes.rows;

    // 3. Fetch State Holidays if state is provided
    let stateHolidays = [];
    if (state) {
        const stateRes = await query(
            `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, holiday_name FROM state_holidays 
             WHERE state = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
            [state, month, year]
        );
        stateHolidays = stateRes.rows;
    }

    // 4. Fetch Company Holidays for the tenant
    // Fetch both tenant-wide holidays (state IS NULL) AND state-specific holidays if a state is selected
    const companyRes = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, holiday_name, state 
         FROM company_holidays 
         WHERE tenant_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
           AND (state IS NULL ${state ? 'OR state = $4' : ''})`,
        state ? [tenantId, month, year, state] : [tenantId, month, year]
    );
    const companyHolidays = companyRes.rows;

    // Determine if we should use ONLY company holidays (strict scoping)
    // If a tenant has uploaded any holidays for this year (either tenant-wide or for this specific state), they override system defaults completely
    const hasCompanyHolidaysForYearRes = await query(
        `SELECT 1 FROM company_holidays WHERE tenant_id = $1 AND EXTRACT(YEAR FROM date) = $2 LIMIT 1`,
        [tenantId, year]
    );
    const useOnlyCompanyHolidays = hasCompanyHolidaysForYearRes.rowCount > 0;

    // 5. Merge using Priority Rules: 1. Company, 2. State, 3. Central, 4. Weekend
    const calendar = generatedDays.map(day => {
        const dateStr = day.date_str;

        let finalHolidayName = day.holiday_name;
        let finalType = day.holiday_type;

        // Check Central Holiday (Priority 3)
        const centralHoliday = centralHolidays.find(h => h.date_str === dateStr);
        if (centralHoliday && !useOnlyCompanyHolidays) { // Only apply if no company holidays exist for the year
            finalHolidayName = centralHoliday.holiday_name;
            finalType = 'Central';
        }

        // Check State Holiday (Priority 2)
        const stateHoliday = stateHolidays.find(h => h.date_str === dateStr);
        if (stateHoliday) {
            finalHolidayName = stateHoliday.holiday_name;
            finalType = 'State';
        }

        // Check Company Holiday (Priority 1 - Overrides everything)
        const companyHoliday = companyHolidays.find(h => h.date_str === dateStr);
        if (companyHoliday) {
            finalHolidayName = companyHoliday.holiday_name;
            finalType = 'Company';
        }

        return {
            ...day,
            date: dateStr,
            holiday_name: finalHolidayName,
            holiday_type: finalType
        };
    });

    return calendar;
};

// Company Holiday CRUD
exports.createCompanyHoliday = async (db, tenantId, date, holidayName, state = null) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO company_holidays (tenant_id, date, holiday_name, state) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (tenant_id, date, COALESCE(state, 'ALL_REGIONS')) DO UPDATE SET holiday_name = $3
         RETURNING *`,
        [tenantId, date, holidayName, state]
    );

    // Broadcast holiday notification (fire and forget)
    try {
        const usersRes = await query(
            `SELECT id FROM users WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`,
            [tenantId]
        );

        if (usersRes.rowCount > 0) {
            const regionText = state ? ` (Region: ${state})` : '';
            const title = `New Holiday: ${holidayName}${regionText}`;
            const message = `A new company holiday has been added for ${date}.`;
            // Note: In a production system, you might only notify users in that state,
            // but for now we broadcast to all so they can see regional holidays
            const values = usersRes.rows.map(u =>
                `('${tenantId}', '${u.id}', '${title}', '${message}', 'info')`
            ).join(',');

            // Do NOT await this query so it doesn't block the API response
            query(
                `INSERT INTO notifications (tenant_id, user_id, title, message, type)
                 VALUES ${values}`
            ).catch(err => console.error('Error inserting holiday notifications (background):', err));
        }
    } catch (err) {
        console.error('Error broadcasting holiday notifications:', err);
    }

    return res.rows[0];
};

exports.getCompanyHolidays = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM company_holidays WHERE tenant_id = $1 ORDER BY date ASC`,
        [tenantId]
    );
    return res.rows;
};

exports.deleteCompanyHoliday = async (db, tenantId, id) => {
    const query = getQuery(db);
    await query(`DELETE FROM company_holidays WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
};

// State Holiday (Management for Super Admin / Seed)
exports.createStateHoliday = async (db, state, date, holidayName) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO state_holidays (state, date, holiday_name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (state, date) DO UPDATE SET holiday_name = $3
         RETURNING *`,
        [state, date, holidayName]
    );
    return res.rows[0];
};

exports.getStates = async (db) => {
    const query = getQuery(db);
    const res = await query(`SELECT DISTINCT state FROM state_holidays ORDER BY state ASC`);
    return res.rows.map(r => r.state);
};

// Announcements Service
exports.getAnnouncements = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM corporate_announcements 
         WHERE tenant_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [tenantId]
    );
    return res.rows;
};

exports.createAnnouncement = async (db, tenantId, userId, data) => {
    const query = getQuery(db);

    // 1. Create the announcement record
    const res = await query(
        `INSERT INTO corporate_announcements (tenant_id, title, message, type, created_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [tenantId, data.title, data.message, data.type || 'General', userId]
    );
    const announcement = res.rows[0];

    // 2. Broadcast to all active users via notifications table
    try {
        const usersRes = await query(
            `SELECT id FROM users WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`,
            [tenantId]
        );

        if (usersRes.rowCount > 0) {
            const values = usersRes.rows.map(u =>
                `('${tenantId}', '${u.id}', '${data.title}', '${data.message.replace(/'/g, "''")}', 'info')`
            ).join(',');

            await query(
                `INSERT INTO notifications (tenant_id, user_id, title, message, type)
                 VALUES ${values}`
            );
        }
    } catch (err) {
        console.error('Error broadcasting announcement notifications:', err);
    }

    return announcement;
};

exports.deleteAnnouncement = async (db, tenantId, id) => {
    const query = getQuery(db);
    await query(`DELETE FROM corporate_announcements WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
};

// Bulk Import Holidays from Excel
exports.bulkImportHolidays = async (db, tenantId, holidays) => {
    const query = getQuery(db);

    // Determine years covered by the import
    const years = [...new Set(holidays.map(h => new Date(h.date).getFullYear()))];

    // Transaction: delete existing company holidays for those years, then insert new ones
    await query('BEGIN');
    try {
        for (const yr of years) {
            await query(
                `DELETE FROM company_holidays WHERE tenant_id = $1 AND EXTRACT(YEAR FROM date) = $2`,
                [tenantId, yr]
            );
        }

        let imported = 0;
        for (const h of holidays) {
            await query(
                `INSERT INTO company_holidays (tenant_id, date, holiday_name, state)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (tenant_id, date, COALESCE(state, 'ALL_REGIONS')) DO UPDATE SET holiday_name = $3`,
                [tenantId, h.date, h.holiday_name, h.state || null]
            );
            imported++;
        }

        // Broadcast notifications to all active users (fire and forget)
        try {
            const usersRes = await query(
                `SELECT id FROM users WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`,
                [tenantId]
            );
            if (usersRes.rowCount > 0) {
                const title = `Holiday Calendar Updated`;
                const message = `${imported} company holidays have been imported for ${years.join(', ')}.`;
                const values = usersRes.rows.map(u =>
                    `('${tenantId}', '${u.id}', '${title}', '${message.replace(/'/g, "''")}', 'info')`
                ).join(',');
                
                // Do NOT await this query so it doesn't block the API response
                query(
                    `INSERT INTO notifications (tenant_id, user_id, title, message, type) VALUES ${values}`
                ).catch(err => console.error('Error inserting holiday import notifications (background):', err));
            }
        } catch (notifErr) {
            console.error('Error broadcasting holiday import notifications:', notifErr);
        }

        await query('COMMIT');
        return { imported, years };
    } catch (e) {
        await query('ROLLBACK');
        throw e;
    }
};
