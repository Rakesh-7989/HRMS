const cron = require('node-cron');
const pool = require("../config/db");
const logger = require("../config/logger");
const leavePolicyService = require("../modules/leave/policies/leavePolicy.service");
<<<<<<< Updated upstream
const timeService = require("../utils/timeService"); // Issue 30

=======
const asyncContext = require("../utils/asyncContext");
>>>>>>> Stashed changes

/**
 * Leave Accrual Job
 * Run monthly to accrue leave balances based on policies
 * Schedule: 0 0 1 * * (1st of every month at midnight)
 * Issue 30: Uses tenant timezone via timeService
 */
const leaveAccrualJob = cron.schedule(
    '0 0 1 * *',
    async () => {
        const startTime = Date.now();
        logger.info("Starting monthly leave accrual job...");

        try {
            // Get all active tenants (with SUPER_ADMIN context to bypass RLS)
            const tenants = await asyncContext.run(new Map([['role', 'SUPER_ADMIN']]), async () => {
                return await pool.query(`SELECT id, name FROM tenants WHERE is_active = true`);
            });

            let totalAccruals = 0;

            for (const tenant of tenants.rows) {
                logger.info(`Processing accruals for tenant: ${tenant.name}`);

                try {
                    // Issue 30: Use tenant-aware timezone for date calculations
                    const tz = await timeService.getEffectiveTz(pool.query.bind(pool), tenant.id);
                    const now = new Date();
                    const tenantDate = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(now);

                    // Only run on the 1st of the month in the tenant's timezone
                    if (parseInt(tenantDate) !== 1) {
                        logger.info(`Skipping tenant ${tenant.name}: not 1st of month in timezone ${tz}`);
                        continue;
                    }

                    // Run with tenant-specific RLS context
                    const result = await asyncContext.run(
                        new Map([['tenantId', tenant.id], ['role', 'ADMIN']]),
                        async () => {
                            return await leavePolicyService.runMonthlyAccrual(null, tenant.id);
                        }
                    );
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

