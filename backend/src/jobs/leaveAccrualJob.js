const cron = require('node-cron');
const pool = require("../config/db");
const logger = require("../config/logger");
const leavePolicyService = require("../modules/leave/policies/leavePolicy.service");

/**
 * Leave Accrual Job
 * Run monthly to accrue leave balances based on policies
 * Schedule: 0 0 1 * * (1st of every month at midnight)
 */
const leaveAccrualJob = cron.schedule(
    '0 0 1 * *',
    async () => {
        const startTime = Date.now();
        logger.info("Starting monthly leave accrual job...");

        try {
            // Get all active tenants
            const tenants = await pool.query(
                `SELECT id, name FROM tenants WHERE is_active = true`
            );

            let totalAccruals = 0;

            for (const tenant of tenants.rows) {
                logger.info(`Processing accruals for tenant: ${tenant.name}`);

                try {
                    const result = await leavePolicyService.runMonthlyAccrual(null, tenant.id);
                    totalAccruals += result.accruals_processed;
                    logger.info(`Tenant ${tenant.name}: ${result.accruals_processed} accruals processed`);
                } catch (err) {
                    logger.error(`Error processing tenant ${tenant.name}:`, err.message);
                }
            }

            const duration = Date.now() - startTime;
            logger.info(`Leave accrual job completed. Total accruals: ${totalAccruals}, Duration: ${duration}ms`);

        } catch (err) {
            logger.error("Leave accrual job failed:", err);
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata'
    }
);

module.exports = leaveAccrualJob;
