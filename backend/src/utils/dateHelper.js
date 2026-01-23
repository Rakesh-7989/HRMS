// src/utils/dateHelper.js
const moment = require('moment');

/**
 * Format a date to a specific format
 * @param {Datestring} date - Date to format
 * @param {string} format - Moment.js format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
exports.formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return null;
    return moment(date).format(format);
};

/**
 * Parse a date string to a Date object
 * @param {string} dateString - Date string to parse
 * @param {string} format - Input format (optional)
 * @returns {Datenull} Parsed date object or null if invalid
 */
exports.parseDate = (dateString, format = null) => {
    if (!dateString) return null;
    const parsed = format ? moment(dateString, format) : moment(dateString);
    return parsed.isValid() ? parsed.toDate() : null;
};

/**
 * Get date range between two dates
 * @param {Datestring} startDate - Start date
 * @param {Datestring} endDate - End date
 * @returns {Array<string>} Array of date strings in YYYY-MM-DD format
 */
exports.getDateRange = (startDate, endDate) => {
    const dates = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
        dates.push(current.format('YYYY-MM-DD'));
        current.add(1, 'days');
    }

    return dates;
};

/**
 * Calculate working days between two dates (excluding weekends)
 * @param {Datestring} startDate - Start date
 * @param {Datestring} endDate - End date
 * @param {Array<string>} holidays - Array of holiday dates in YYYY-MM-DD format (optional)
 * @returns {number} Number of working days
 */
exports.calculateWorkingDays = (startDate, endDate, holidays = []) => {
    let workingDays = 0;
    const current = moment(startDate);
    const end = moment(endDate);
    const holidaySet = new Set(holidays);

    while (current.isSameOrBefore(end)) {
        const dayOfWeek = current.day();
        const dateStr = current.format('YYYY-MM-DD');

        // Skip weekends (Saturday = 6, Sunday = 0) and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
            workingDays++;
        }

        current.add(1, 'days');
    }

    return workingDays;
};

/**
 * Check if a date is a weekend
 * @param {Datestring} date - Date to check
 * @returns {boolean} True if weekend, false otherwise
 */
exports.isWeekend = (date) => {
    const dayOfWeek = moment(date).day();
    return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Add business days to a date (excluding weekends)
 * @param {Datestring} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {Date} Resulting date
 */
exports.addBusinessDays = (date, days) => {
    const current = moment(date);
    let remainingDays = Math.abs(days);
    const direction = days >= 0 ? 1 : -1;

    while (remainingDays > 0) {
        current.add(direction, 'days');
        const dayOfWeek = current.day();

        // Only count weekdays
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remainingDays--;
        }
    }

    return current.toDate();
};

/**
 * Get start of day
 * @param {Datestring} date - Date
 * @returns {Date} Start of day
 */
exports.startOfDay = (date) => {
    return moment(date).startOf('day').toDate();
};

/**
 * Get end of day
 * @param {Datestring} date - Date
 * @returns {Date} End of day
 */
exports.endOfDay = (date) => {
    return moment(date).endOf('day').toDate();
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
exports.getCurrentDate = () => {
    return moment().format('YYYY-MM-DD');
};

/**
 * Get current timestamp
 * @returns {Date} Current timestamp
 */
exports.getCurrentTimestamp = () => {
    return new Date();
};

/**
 * Calculate difference in days between two dates
 * @param {Datestring} date1 - First date
 * @param {Datestring} date2 - Second date
 * @returns {number} Difference in days
 */
exports.daysDifference = (date1, date2) => {
    return moment(date1).diff(moment(date2), 'days');
};

/**
 * Calculate time difference in hours between two time strings
 * @param {string} startTime - Start time in HH:mm:ss format
 * @param {string} endTime - End time in HH:mm:ss format
 * @returns {number} Difference in hours (decimal)
 */
exports.calculateHoursDifference = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;

    const start = moment(startTime, 'HH:mm:ss');
    const end = moment(endTime, 'HH:mm:ss');

    // Handle case where end time is next day
    if (end.isBefore(start)) {
        end.add(1, 'day');
    }

    const duration = moment.duration(end.diff(start));
    return duration.asHours();
};

/**
 * Format duration in hours to human readable format
 * @param {number} hours - Hours as decimal
 * @returns {string} Formatted duration (e.g., "8h 30m")
 */
exports.formatDuration = (hours) => {
    if (!hours || hours <= 0) return '0h 0m';

    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return `${h}h ${m}m`;
};
