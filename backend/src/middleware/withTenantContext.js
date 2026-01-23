// src/middleware/withTenantContext.js
const { UnauthorizedError, ForbiddenError } = require('../utils/customErrors');
const pool = require('../config/db');

/**
 * Middleware to extract and validate tenant context from JWT
 * Must be used after JWT verification middleware
 */
module.exports = async function withTenantContext(req, res, next) {
    try {
        // Ensure user is authenticated
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        const { tenantId, userId, role } = req.user;

        // Super admin doesn't need tenant validation
        if (role === 'SUPER_ADMIN') {
            return next();
        }

        // Validate tenant ID exists
        if (!tenantId) {
            return next(new ForbiddenError('Tenant context missing'));
        }

        // Verify tenant exists and is active
        const tenantResult = await pool.query(
            'SELECT id, name, is_active FROM tenants WHERE id = $1',
            [tenantId]
        );

        if (tenantResult.rowCount === 0) {
            return next(new ForbiddenError('Invalid tenant'));
        }

        const tenant = tenantResult.rows[0];

        if (!tenant.is_active) {
            return next(new ForbiddenError('Tenant account is inactive'));
        }

        // Check subscription status
        const subscriptionResult = await pool.query(
            `SELECT status, end_date, trial_end_date 
             FROM tenant_subscription 
             WHERE tenant_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [tenantId]
        );

        if (subscriptionResult.rowCount > 0) {
            const subscription = subscriptionResult.rows[0];

            // Check if subscription is expired
            if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
                return next(new ForbiddenError('Subscription expired or cancelled'));
            }

            // Check trial expiry
            if (subscription.status === 'TRIAL' && subscription.trial_end_date) {
                const trialEndDate = new Date(subscription.trial_end_date);
                if (trialEndDate < new Date()) {
                    return next(new ForbiddenError('Trial period has expired'));
                }
            }

            // Attach subscription info to request
            req.subscription = subscription;
        }

        // Attach tenant info to request
        req.tenant = tenant;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to require specific tenant (for super admin operations)
 * @param {string} tenantIdParam - Name of the route parameter containing tenant ID
 */
module.exports.requireTenant = (tenantIdParam = 'tenantId') => {
    return async (req, res, next) => {
        try {
            const tenantId = req.params[tenantIdParam];

            if (!tenantId) {
                return next(new ForbiddenError('Tenant ID required'));
            }

            const tenantResult = await pool.query(
                'SELECT id, name, is_active FROM tenants WHERE id = $1',
                [tenantId]
            );

            if (tenantResult.rowCount === 0) {
                return next(new ForbiddenError('Tenant not found'));
            }

            req.tenant = tenantResult.rows[0];
            next();
        } catch (error) {
            next(error);
        }
    };
};
