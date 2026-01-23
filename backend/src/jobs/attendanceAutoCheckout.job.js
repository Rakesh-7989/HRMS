// src/jobs/attendanceAutoCheckout.job.js
const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const moment = require('moment');

/**
 * Auto-checkout job (PENDING CHECKOUT WORKFLOW)
 * Marks unchecked-out employees with PENDING_CHECKOUT status at end of day (11:59 PM)
 * This allows employees/managers to review and confirm the actual status
 * 
 * Workflow:
 * 1. 11:59 PM: Employee with no check-out → status = 'PENDING_CHECKOUT'
 * 2. Employee/Manager reviews and confirms actual status (PRESENT/ABSENT/etc)
 * 3. HR/Admin can auto-approve after 24 hours if not confirmed
 */
const attendanceAutoCheckout = cron.schedule(
    '59 23 * * *',
    async () => {
        try {
            logger.info('Running attendance auto-checkout job (Pending Checkout Workflow)...');

            const today = moment().format('YYYY-MM-DD');

            // Find attendance records with check-in but no check-out
            // Mark them as PENDING_CHECKOUT for review instead of auto-closing
            const result = await pool.query(
                `UPDATE attendance
                 SET status = 'PENDING_CHECKOUT',
                     check_out_time = '23:59:00',
                     notes = COALESCE(notes, '') || ' Auto-checkout pending confirmation',
                     updated_at = NOW()
                 WHERE date = $1
                   AND check_in_time IS NOT NULL
                   AND check_out_time IS NULL
                 RETURNING id, employee_id, check_in_time`,
                [today]
            );

            if (result.rowCount > 0) {
                logger.info(`Marked ${result.rowCount} employees for checkout confirmation on ${today}`);

                // Log each pending checkout
                result.rows.forEach(row => {
                    logger.debug(`Pending checkout: Employee ${row.employee_id}, Check-in: ${row.check_in_time}`);
                });
            } else {
                logger.info(`No employees to mark pending for ${today}`);
            }

        } catch (error) {
            logger.error('Error in attendance auto-checkout job:', error);
        }
    },
    {
        scheduled: false, 
        timezone: process.env.TZ || 'Asia/Kolkata'
    }
);

module.exports = attendanceAutoCheckout;
