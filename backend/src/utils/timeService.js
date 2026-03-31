const moment = require('moment');

/**
 * Resolves the effective timezone for a tenant or employee.
 * Logic:
 * 1. Check if employee has a custom timezone.
 * 2. Fallback to tenant's default timezone.
 * 3. Final fallback to 'UTC'.
 */
const getEffectiveTz = async (query, tenantId, employeeId = null) => {
    try {
        if (employeeId) {
            const empRes = await query(
                `SELECT timezone FROM employees WHERE id = $1 AND tenant_id = $2`,
                [employeeId, tenantId]
            );
            if (empRes.rows[0]?.timezone) return empRes.rows[0].timezone;
        }

        const tenantRes = await query(
            `SELECT settings->>'timezone' as tz FROM tenants WHERE id = $1`,
            [tenantId]
        );
        return tenantRes.rows[0]?.tz || 'Asia/Kolkata';
    } catch (err) {
        console.error('Error resolving timezone:', err);
        return 'Asia/Kolkata';
    }
};

/**
 * Returns current date in YYYY-MM-DD format for a given timezone.
 */
const todayDate = (timeZone = 'Asia/Kolkata') => {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone });
    } catch (err) {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
};

/**
 * Returns current time in HH:mm:ss format for a given timezone.
 */
const nowTime = (timeZone = 'Asia/Kolkata') => {
    try {
        return new Date().toLocaleTimeString('en-GB', { timeZone, hour12: false }).slice(0, 8);
    } catch (err) {
        return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).slice(0, 8);
    }
};

/**
 * Returns a Date object for the current time in UTC.
 * Useful for absolute comparisons.
 */
const nowUTC = () => {
    return new Date();
};

module.exports = {
    getEffectiveTz,
    todayDate,
    nowTime,
    nowUTC
};
