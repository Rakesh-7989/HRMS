const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return db.query;
    return pool.query.bind(pool);
};

exports.getCalendar = async (db, tenantId, month, year, state) => {
    const query = getQuery(db);

    // 1. Fetch Base Calendar (Central + Weekends)
    const baseRes = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, day, is_weekend, holiday_name, holiday_type 
         FROM base_calendar 
         WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
         ORDER BY date ASC`,
        [month, year]
    );

    // 2. Fetch State Holidays if state is provided
    let stateHolidays = [];
    if (state) {
        const stateRes = await query(
            `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, holiday_name FROM state_holidays 
             WHERE state = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
            [state, month, year]
        );
        stateHolidays = stateRes.rows;
    }

    // 3. Fetch Company Holidays for the tenant
    const companyRes = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, holiday_name FROM company_holidays 
         WHERE tenant_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
        [tenantId, month, year]
    );
    const companyHolidays = companyRes.rows;

    // 4. Merge using Priority Rules: 1. Company, 2. State, 3. Central
    const calendar = baseRes.rows.map(day => {
        const dateStr = day.date_str;

        let finalHolidayName = day.holiday_name;
        let finalType = day.holiday_type;

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
exports.createCompanyHoliday = async (db, tenantId, date, holidayName) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO company_holidays (tenant_id, date, holiday_name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (tenant_id, date) DO UPDATE SET holiday_name = $3
         RETURNING *`,
        [tenantId, date, holidayName]
    );
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
    const res = await query(
        `INSERT INTO corporate_announcements (tenant_id, title, message, type, created_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [tenantId, data.title, data.message, data.type || 'General', userId]
    );
    return res.rows[0];
};

exports.deleteAnnouncement = async (db, tenantId, id) => {
    const query = getQuery(db);
    await query(`DELETE FROM corporate_announcements WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
};
