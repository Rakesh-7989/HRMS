const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const moment = require('moment');
const subscriptionService = require('../modules/subscriptions/subscriptions.service');
const invoiceService = require('../modules/subscriptions/invoice.service');
const mailer = require('../config/mailer');

/**
 * Subscription renewal and expiry check job
 * Runs daily at midnight
 */
const subscriptionRenewal = cron.schedule(
    '0 0 * * *', // Run at midnight every day
    async () => {
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

            // 2. SEND RENEWAL EMAILS (7 days, 3 days, and Today)

            // 7 Days Reminder
            const sevenDayDate = moment().add(7, 'days').format('YYYY-MM-DD');
            const sevenDayRes = await pool.query(`
                SELECT s.end_date, t.name as tenant_name, t.email as tenant_email, p.name as plan_name
                FROM subscriptions s
                JOIN tenants t ON s.tenant_id = t.id
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('ACTIVE', 'TRIAL') AND s.end_date = $1
            `, [sevenDayDate]);

            for (const sub of sevenDayRes.rows) {
                try {
                    await mailer.sendSubscriptionRenewalEmail(sub.tenant_email, sub.tenant_name, sub.plan_name, sub.end_date, 'reminder');
                    logger.info(`Sent 7-day renewal reminder to ${sub.tenant_email}`);
                } catch (err) {
                    logger.error(`Failed to send 7-day reminder to ${sub.tenant_email}:`, err);
                }
            }

            // 3 Days Urgent Reminder
            const threeDayDate = moment().add(3, 'days').format('YYYY-MM-DD');
            const threeDayRes = await pool.query(`
                SELECT s.end_date, t.name as tenant_name, t.email as tenant_email, p.name as plan_name
                FROM subscriptions s
                JOIN tenants t ON s.tenant_id = t.id
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('ACTIVE', 'TRIAL') AND s.end_date = $1
            `, [threeDayDate]);

            for (const sub of threeDayRes.rows) {
                try {
                    await mailer.sendSubscriptionRenewalEmail(sub.tenant_email, sub.tenant_name, sub.plan_name, sub.end_date, 'urgent');
                    logger.info(`Sent 3-day urgent reminder to ${sub.tenant_email}`);
                } catch (err) {
                    logger.error(`Failed to send 3-day urgent reminder to ${sub.tenant_email}:`, err);
                }
            }

            // Today Expiry Notice
            const todayRes = await pool.query(`
                SELECT s.end_date, t.name as tenant_name, t.email as tenant_email, p.name as plan_name
                FROM subscriptions s
                JOIN tenants t ON s.tenant_id = t.id
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE') AND s.end_date = $1
            `, [today]);

            for (const sub of todayRes.rows) {
                try {
                    await mailer.sendSubscriptionRenewalEmail(sub.tenant_email, sub.tenant_name, sub.plan_name, sub.end_date, 'expired');
                    logger.info(`Sent expiry notice to ${sub.tenant_email}`);
                } catch (err) {
                    logger.error(`Failed to send expiry notice to ${sub.tenant_email}:`, err);
                }
            }

            // 3. HANDLE EXPIRATIONS (Access block after grace)
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

            // 4. AUTO-TRANSITION TO PAST_DUE
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
    },
    {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    }
);

module.exports = subscriptionRenewal;

module.exports = subscriptionRenewal;
