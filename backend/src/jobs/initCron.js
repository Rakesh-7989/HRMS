// src/jobs/initCron.js
const logger = require('../config/logger');

// Import all cron jobs
const attendanceAutoCheckout = require('./attendanceAutoCheckout.job');
const sendDailyReports = require('./sendDailyReports.job');
const subscriptionRenewal = require('./subscriptionRenewal.job');
const leaveAccrualJob = require('./leaveAccrualJob');

// Registry of all cron jobs
const jobs = {
    attendanceAutoCheckout: {
        name: 'Attendance Auto-Checkout',
        job: attendanceAutoCheckout,
        description: 'Auto-checkout employees at end of day (11:59 PM)',
        schedule: '59 23 * * *'
    },
    sendDailyReports: {
        name: 'Send Daily Reports',
        job: sendDailyReports,
        description: 'Send daily attendance reports to HR/Admin (6:00 AM)',
        schedule: '0 6 * * *'
    },
    subscriptionRenewal: {
        name: 'Subscription Renewal',
        job: subscriptionRenewal,
        description: 'Check and process subscription renewals (midnight)',
        schedule: '0 0 * * *'
    },
    leaveAccrual: {
        name: 'Leave Accrual',
        job: leaveAccrualJob,
        description: 'Monthly leave accrual (1st of month)',
        schedule: '0 0 1 * *'
    }
};

/**
 * Initialize and start all cron jobs
 */
const initCronJobs = () => {
    try {
        logger.info('Initializing cron jobs...');

        Object.entries(jobs).forEach(([key, jobConfig]) => {
            try {
                jobConfig.job.start();
                logger.info(`✓ Started: ${jobConfig.name} (${jobConfig.schedule})`);
            } catch (error) {
                logger.error(`✗ Failed to start ${jobConfig.name}:`, error);
            }
        });

        logger.info(`Successfully initialized ${Object.keys(jobs).length} cron jobs`);

        // Log job schedules
        logger.info('Cron job schedules:');
        Object.values(jobs).forEach(jobConfig => {
            logger.info(`  - ${jobConfig.name}: ${jobConfig.description}`);
        });

    } catch (error) {
        logger.error('Error initializing cron jobs:', error);
        throw error;
    }
};

/**
 * Stop all cron jobs gracefully
 */
const stopCronJobs = () => {
    try {
        logger.info('Stopping all cron jobs...');

        Object.entries(jobs).forEach(([key, jobConfig]) => {
            try {
                jobConfig.job.stop();
                logger.info(`✓ Stopped: ${jobConfig.name}`);
            } catch (error) {
                logger.error(`✗ Failed to stop ${jobConfig.name}:`, error);
            }
        });

        logger.info('All cron jobs stopped');
    } catch (error) {
        logger.error('Error stopping cron jobs:', error);
    }
};

/**
 * Get status of all cron jobs
 */
const getCronJobsStatus = () => {
    return Object.entries(jobs).map(([key, jobConfig]) => ({
        key,
        name: jobConfig.name,
        description: jobConfig.description,
        schedule: jobConfig.schedule,
        running: jobConfig.job.getStatus() === 'scheduled'
    }));
};

/**
 * Manually trigger a specific cron job
 * @param {string} jobKey - Key of the job to trigger
 */
const triggerJob = async (jobKey) => {
    const jobConfig = jobs[jobKey];

    if (!jobConfig) {
        throw new Error(`Job '${jobKey}' not found`);
    }

    logger.info(`Manually triggering job: ${jobConfig.name}`);

    // Get the task function from the cron job
    // Note: This is a workaround since node-cron doesn't expose the task directly
    // In production, you might want to extract the task logic into separate functions
    logger.warn('Manual job triggering not fully implemented. Please restart the job instead.');
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, stopping cron jobs...');
    stopCronJobs();
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, stopping cron jobs...');
    stopCronJobs();
    process.exit(0);
});

module.exports = {
    initCronJobs,
    stopCronJobs,
    getCronJobsStatus,
    triggerJob,
    jobs
};
