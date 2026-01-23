const subscriptionService = require('../modules/subscriptions/subscriptions.service');

const requireFeature = (featurePath) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.user.tenantId;
            const subscription = await subscriptionService.getSubscriptionByTenantId(tenantId);

            if (!subscription) {
                return res.status(403).json({ message: 'No active subscription found.' });
            }

            // featurePath like "payroll_automation.loans"
            const features = subscription.features;
            const pathParts = featurePath.split('.');

            let current = features;
            for (const part of pathParts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    current = false;
                    break;
                }
            }

            if (current === true) {
                return next();
            }

            res.status(403).json({
                message: `Feature '${featurePath}' is not included in your current '${subscription.plan_name}' plan. Please upgrade to access this feature.`
            });
        } catch (error) {
            console.error('Subscription Middleware Error:', error);
            res.status(500).json({ message: 'Error checking subscription features.' });
        }
    };
};

module.exports = {
    requireFeature
};
