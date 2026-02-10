const subscriptionService = require('../modules/subscriptions/subscriptions.service');

const requireFeature = (featurePath) => {
    return async (req, res, next) => {
        try {
            // SUPER_ADMIN bypasses all feature gates
            if (req.user?.role === 'SUPER_ADMIN') {
                return next();
            }

            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return next(); // If no tenant context, cannot check features, let other middleware handle it
            }

            const subscription = await subscriptionService.getSubscriptionByTenantId(tenantId);

            // --- SUBSCRIPTION STATUS ENFORCEMENT ---
            const status = subscription.status;

            // Block access if EXPIRED or SUSPENDED
            if (status === 'EXPIRED' || status === 'SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    message: `Your organization is currently ${status}. Please contact support or resolve billing issues to continue.`,
                    code: `SUBSCRIPTION_${status}`
                });
            }

            // PAST_DUE allows limited access or warning? 
            // Standard SaaS: PAST_DUE allows access but shows a banner.
            // We'll allow it here, but maybe add a header for the frontend to show a banner.
            if (status === 'PAST_DUE') {
                res.setHeader('X-Subscription-Warning', 'PAST_DUE');
            }

            // featurePath like "payroll_automation.loans" or just "payroll_automation"
            const features = subscription.features;
            const pathParts = featurePath.split('.');

            let current = features;
            for (const part of pathParts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    current = null;
                    break;
                }
            }

            let isEnabled = false;
            if (typeof current === 'boolean') {
                isEnabled = current;
            } else if (current && typeof current === 'object') {
                isEnabled = Object.values(current).some(val =>
                    val === true || (typeof val === 'object' && Object.values(val).some(v => v === true))
                );
            }

            if (isEnabled) {
                return next();
            }

            res.status(403).json({
                success: false,
                message: `Feature '${featurePath}' is not included in your current '${subscription.plan_name}' plan. Please upgrade to access this feature.`,
                code: 'FEATURE_DISABLED'
            });
        } catch (error) {
            console.error('Subscription Middleware Error:', error);
            res.status(500).json({ message: 'Error checking subscription features.' });
        }
    };
};

const checkAccess = () => {
    return async (req, res, next) => {
        try {
            if (req.user?.role === 'SUPER_ADMIN') return next();
            const tenantId = req.user?.tenantId;
            if (!tenantId) return next();

            const subscription = await subscriptionService.getSubscriptionByTenantId(tenantId);
            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No active subscription found. Please subscribe to continue.',
                    code: 'NO_SUBSCRIPTION'
                });
            }

            const status = subscription.status;
            if (status === 'EXPIRED' || status === 'SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    message: `Your organization is currently ${status}. Please contact support or resolve billing issues to continue.`,
                    code: `SUBSCRIPTION_${status}`
                });
            }

            next();
        } catch (error) {
            console.error('Access Check Error:', error);
            res.status(500).json({ message: 'Error checking subscription access.' });
        }
    };
};

const checkLimit = () => {
    return async (req, res, next) => {
        try {
            if (req.user?.role === 'SUPER_ADMIN') return next();
            const tenantId = req.user?.tenantId;
            if (!tenantId) return next();

            const canAdd = await subscriptionService.checkEmployeeLimit(tenantId);
            if (canAdd) {
                return next();
            }

            res.status(403).json({
                success: false,
                message: 'Your organization has reached the maximum number of employees allowed by your current plan. Please upgrade to add more.',
                code: 'LIMIT_REACHED'
            });
        } catch (error) {
            console.error('Limit Check Error:', error);
            res.status(500).json({ message: 'Error checking subscription limits.' });
        }
    };
};

module.exports = {
    requireFeature,
    checkLimit,
    checkAccess
};
