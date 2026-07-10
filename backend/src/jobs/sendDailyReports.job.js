// src/jobs/sendDailyReports.job.js
const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const mailer = require('../config/mailer');
const moment = require('moment');
const asyncContext = require('../utils/asyncContext');

/**
 * Send daily attendance reports
 * Sends email reports to HR and Admin users
 * Runs daily at 6:00 AM
 */
const sendDailyReports = cron.schedule(
    '0 6 * * *',
    async () => {
        try {
            logger.info('Running daily attendance reports job...');

            const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

            // Get all active tenants (with SUPER_ADMIN context to bypass RLS)
            const tenantsResult = await asyncContext.run(new Map([['role', 'SUPER_ADMIN']]), async () => {
                return await pool.query('SELECT id, name FROM tenants WHERE is_active = true');
            });

            for (const tenant of tenantsResult.rows) {
                try {
                    // Run with tenant-specific RLS context
                    await asyncContext.run(
                        new Map([['tenantId', tenant.id], ['role', 'ADMIN']]),
                        async () => {
                            // Get attendance statistics for the tenant
                            const statsResult = await pool.query(
                                `SELECT 
                                    COUNT(DISTINCT e.id) as total_employees,
                                    COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.employee_id END) as present,
                                    COUNT(DISTINCT CASE WHEN a.status = 'ABSENT' THEN a.employee_id END) as absent,
                                    COUNT(DISTINCT CASE WHEN a.status = 'LEAVE' THEN a.employee_id END) as on_leave,
                                    COUNT(DISTINCT CASE WHEN a.is_late = true THEN a.employee_id END) as late_arrivals
                                 FROM employees e
                                 LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
                                 WHERE e.tenant_id = $2 AND e.status = 'ACTIVE'`,
                                [yesterday, tenant.id]
                            );

                            const stats = statsResult.rows[0];

                            // Get HR and Admin email addresses for this tenant
                            // FIX: JOIN was using u.employee_id which doesn't exist — correct relationship is e.user_id = u.id
                            const recipientsResult = await pool.query(
                                `SELECT DISTINCT u.email
                                 FROM users u
                                 INNER JOIN employees e ON e.user_id = u.id
                                 WHERE u.tenant_id = $1 
                                   AND u.role IN ('ADMIN', 'HR')
                                   AND u.is_active = true`,
                                [tenant.id]
                            );

                            if (recipientsResult.rowCount === 0) {
                                logger.warn(`No recipients found for tenant ${tenant.name}`);
                                return;
                            }

                            const recipients = recipientsResult.rows.map(r => r.email);

                            // Prepare report data
                            const reportData = {
                                date: yesterday,
                                tenantName: tenant.name,
                                totalEmployees: parseInt(stats.total_employees, 10),
                                present: parseInt(stats.present, 10),
                                absent: parseInt(stats.absent, 10),
                                onLeave: parseInt(stats.on_leave, 10),
                                lateArrivals: parseInt(stats.late_arrivals, 10)
                            };

                            // Send email to all recipients
                            for (const email of recipients) {
                                await mailer.sendDailyReport(email, reportData);
                            }

                            logger.info(`Daily report sent for tenant ${tenant.name} to ${recipients.length} recipients`);
                        }
                    );

                } catch (tenantError) {
                    logger.error(`Error processing daily report for tenant ${tenant.name}:`, tenantError);
                }
            }

            logger.info('Daily attendance reports job completed');

        } catch (error) {
            logger.error('Error in daily reports job:', error);
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata'
    }
);

module.exports = sendDailyReports;
