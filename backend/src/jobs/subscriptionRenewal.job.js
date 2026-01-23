// src/jobs/subscriptionRenewal.job.js
const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');
const mailer = require('../config/mailer');
const moment = require('moment');

/**
 * Subscription renewal and expiry check job
 * Checks for expiring trials and subscriptions
 * Sends notifications and updates statuses
 * Runs daily at midnight
 */
const subscriptionRenewal = cron.schedule(
    '0 0 * * *', // Run at midnight every day
    async () => {
        try {
            logger.info('Running subscription renewal job...');

            const today = moment().format('YYYY-MM-DD');

            // Check for expiring trials (7 days before expiry)
            const trialWarningDate = moment().add(7, 'days').format('YYYY-MM-DD');

            const expiringTrialsResult = await pool.query(
                `SELECT ts.id, ts.tenant_id, ts.trial_end_date, t.name as tenant_name, u.email
                 FROM tenant_subscription ts
                 INNER JOIN tenants t ON ts.tenant_id = t.id
                 INNER JOIN users u ON u.tenant_id = t.id AND u.role = 'ADMIN'
                 WHERE ts.status = 'TRIAL'
                   AND ts.trial_end_date = $1
                   AND t.is_active = true`,
                [trialWarningDate]
            );

            for (const trial of expiringTrialsResult.rows) {
                try {
                    await mailer.sendMail({
                        to: trial.email,
                        subject: 'Trial Period Expiring Soon',
                        html: `
                            <h1>Trial Period Expiring</h1>
                            <p>Dear ${trial.tenant_name},</p>
                            <p>Your trial period will expire in 7 days on ${moment(trial.trial_end_date).format('MMMM DD, YYYY')}.</p>
                            <p>Please upgrade your subscription to continue using our services.</p>
                            <p>Thank you!</p>
                        `
                    });

                    logger.info(`Trial expiry warning sent to ${trial.email} for tenant ${trial.tenant_name}`);
                } catch (emailError) {
                    logger.error(`Error sending trial warning email to ${trial.email}:`, emailError);
                }
            }

            const expiredTrialsResult = await pool.query(
                `UPDATE tenant_subscription
                 SET status = 'EXPIRED', updated_at = NOW()
                 WHERE status = 'TRIAL'
                   AND trial_end_date < $1
                 RETURNING id, tenant_id`,
                [today]
            );

            if (expiredTrialsResult.rowCount > 0) {
                logger.info(`Expired ${expiredTrialsResult.rowCount} trial subscriptions`);

                // Deactivate tenants with expired trials
                for (const expired of expiredTrialsResult.rows) {
                    await pool.query(
                        'UPDATE tenants SET is_active = false WHERE id = $1',
                        [expired.tenant_id]
                    );
                }
            }

            // Check for expiring subscriptions (3 days before expiry)
            const subscriptionWarningDate = moment().add(3, 'days').format('YYYY-MM-DD');

            const expiringSubscriptionsResult = await pool.query(
                `SELECT ts.id, ts.tenant_id, ts.end_date, t.name as tenant_name, u.email
                 FROM tenant_subscription ts
                 INNER JOIN tenants t ON ts.tenant_id = t.id
                 INNER JOIN users u ON u.tenant_id = t.id AND u.role = 'ADMIN'
                 WHERE ts.status = 'ACTIVE'
                   AND ts.end_date = $1
                   AND t.is_active = true`,
                [subscriptionWarningDate]
            );

            // Send subscription expiry warnings
            for (const subscription of expiringSubscriptionsResult.rows) {
                try {
                    await mailer.sendMail({
                        to: subscription.email,
                        subject: 'Subscription Expiring Soon',
                        html: `
                            <h1>Subscription Expiring</h1>
                            <p>Dear ${subscription.tenant_name},</p>
                            <p>Your subscription will expire in 3 days on ${moment(subscription.end_date).format('MMMM DD, YYYY')}.</p>
                            <p>Please renew your subscription to avoid service interruption.</p>
                            <p>Thank you!</p>
                        `
                    });

                    logger.info(`Subscription expiry warning sent to ${subscription.email}`);
                } catch (emailError) {
                    logger.error(`Error sending subscription warning email:`, emailError);
                }
            }

            // Expire subscriptions that have ended
            const expiredSubscriptionsResult = await pool.query(
                `UPDATE tenant_subscription
                 SET status = 'EXPIRED', updated_at = NOW()
                 WHERE status = 'ACTIVE'
                   AND end_date < $1
                   AND auto_renew = false
                 RETURNING id, tenant_id`,
                [today]
            );

            if (expiredSubscriptionsResult.rowCount > 0) {
                logger.info(`Expired ${expiredSubscriptionsResult.rowCount} subscriptions`);

                // Deactivate tenants with expired subscriptions
                for (const expired of expiredSubscriptionsResult.rows) {
                    await pool.query(
                        'UPDATE tenants SET is_active = false WHERE id = $1',
                        [expired.tenant_id]
                    );
                }
            }

            // Auto-renew subscriptions
            const autoRenewResult = await pool.query(
                `UPDATE tenant_subscription
                 SET end_date = end_date + INTERVAL '1 month',
                     updated_at = NOW()
                 WHERE status = 'ACTIVE'
                   AND end_date < $1
                   AND auto_renew = true
                 RETURNING id, tenant_id`,
                [today]
            );

            if (autoRenewResult.rowCount > 0) {
                logger.info(`Auto-renewed ${autoRenewResult.rowCount} subscriptions`);
            }

            logger.info('Subscription renewal job completed');

        } catch (error) {
            logger.error('Error in subscription renewal job:', error);
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata'
    }
);

module.exports = subscriptionRenewal;
