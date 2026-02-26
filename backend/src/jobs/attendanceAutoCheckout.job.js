// src/jobs/attendanceAutoCheckout.job.js
const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const moment = require('moment');
const asyncContext = require('../utils/asyncContext');

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

            // Get all active tenants to process per-tenant (ensures RLS isolation)
            const tenantsResult = await asyncContext.run(new Map([['role', 'SUPER_ADMIN']]), async () => {
                return await pool.query('SELECT id, name FROM tenants WHERE is_active = true');
            });

            let totalMarked = 0;

            for (const tenant of tenantsResult.rows) {
                try {
                    // Run with tenant-specific RLS context
                    const result = await asyncContext.run(
                        new Map([['tenantId', tenant.id], ['role', 'ADMIN']]),
                        async () => {
                            return await pool.query(
                                `UPDATE attendance
                                 SET status = 'PENDING_CHECKOUT',
                                     check_out_time = '23:59:00',
                                     notes = COALESCE(notes, '') || ' Auto-checkout pending confirmation',
                                     updated_at = NOW()
                                 WHERE date = $1
                                   AND tenant_id = $2
                                   AND check_in_time IS NOT NULL
                                   AND check_out_time IS NULL
                                 RETURNING id, employee_id, check_in_time`,
                                [today, tenant.id]
                            );
                        }
                    );

                    if (result.rowCount > 0) {
                        totalMarked += result.rowCount;
                        logger.info(`Tenant ${tenant.name}: Marked ${result.rowCount} employees for checkout confirmation`);
                    }
                } catch (tenantError) {
                    logger.error(`Error processing auto-checkout for tenant ${tenant.name}:`, tenantError);
                }
            }

            logger.info(`Auto-checkout job completed. Total marked: ${totalMarked} on ${today}`);

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
