const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const moment = require('moment');
const subscriptionService = require('../modules/subscriptions/subscriptions.service');
const invoiceService = require('../modules/subscriptions/invoice.service');
const asyncContext = require('../utils/asyncContext');

/**
 * Subscription renewal and expiry check job
 * Runs daily at midnight
 * Uses SUPER_ADMIN context since subscription management is cross-tenant
 */
const subscriptionRenewal = cron.schedule(
    '0 0 * * *', // Run at midnight every day
    async () => {
        // Wrap entire job in SUPER_ADMIN context for cross-tenant subscription management
        await asyncContext.run(new Map([['role', 'SUPER_ADMIN']]), async () => {
            try {
                logger.info('Starting robust subscription renewal job...');
                const now = moment();
                const today = now.format('YYYY-MM-DD');

                // 1. GENERATE RENEWAL INVOICES (5 days before expiry)
                const renewalWarningDate = moment().add(5, 'days').format('YYYY-MM-DD');
                const toRenewRes = await pool.query(`
                    SELECT s.* 
                    FROM subscriptions s
                    WHERE s.status IN ('ACTIVE', 'TRIAL')
                      AND s.end_date = $1
                      AND s.cancel_at_period_end = FALSE
                      AND s.is_trial = FALSE
                `, [renewalWarningDate]);

                for (const sub of toRenewRes.rows) {
                    try {
                        // Check if invoice already exists for this next period
                        const existingInv = await pool.query(`
                            SELECT id FROM subscription_invoices 
                            WHERE subscription_id = $1 
                              AND billing_period_start = $2
                        `, [sub.id, sub.end_date]);

                        if (existingInv.rowCount === 0) {
                            logger.info(`Generating renewal invoice for tenant ${sub.tenant_id}`);
                            await subscriptionService.initiateSubscription(sub.tenant_id, sub.plan_id, sub.billing_cycle);
                        }
                    } catch (err) {
                        logger.error(`Failed to generate renewal for tenant ${sub.tenant_id}:`, err);
                    }
                }

                // 2. HANDLE EXPIRATIONS (Access block after grace)
                // If end_date is in the past and status is not yet EXPIRED
                const gracePeriodDays = 5;
                const expiryThreshold = moment().subtract(gracePeriodDays, 'days').format('YYYY-MM-DD');

                const toExpireRes = await pool.query(`
                    UPDATE subscriptions
                    SET status = 'EXPIRED', updated_at = NOW()
                    WHERE status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED')
                      AND end_date < $1
                    RETURNING id, tenant_id
                `, [expiryThreshold]);

                if (toExpireRes.rowCount > 0) {
                    logger.info(`Marked ${toExpireRes.rowCount} subscriptions as EXPIRED.`);
                }

                // 3. AUTO-TRANSITION TO PAST_DUE
                // If end_date has passed but still within grace, mark as PAST_DUE if not already
                const toPastDueRes = await pool.query(`
                    UPDATE subscriptions
                    SET status = 'PAST_DUE', updated_at = NOW()
                    WHERE status = 'ACTIVE'
                      AND end_date < $1
                      AND end_date >= $2
                    RETURNING id, tenant_id
                `, [today, expiryThreshold]);

                if (toPastDueRes.rowCount > 0) {
                    logger.info(`Marked ${toPastDueRes.rowCount} subscriptions as PAST_DUE.`);
                }

                logger.info('Subscription renewal job completed.');
            } catch (error) {
                logger.error('Error in subscription renewal job:', error);
            }
        });
    },
    {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    }
);

module.exports = subscriptionRenewal;
