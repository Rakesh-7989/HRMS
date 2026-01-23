const subscriptionService = require('./subscriptions.service');

class SubscriptionController {
    async getPlans(req, res) {
        try {
            const plans = await subscriptionService.getPlans();
            res.status(200).json({
                success: true,
                data: plans
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching plans',
                error: error.message
            });
        }
    }

    async getMySubscription(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const subscription = await subscriptionService.getSubscriptionByTenantId(tenantId);

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'No active subscription found for this tenant.'
                });
            }

            res.status(200).json({
                success: true,
                data: subscription
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching subscription',
                error: error.message
            });
        }
    }

    async upgradeSubscription(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const { plan_id, billing_cycle } = req.body;

            const updated = await subscriptionService.upgradeSubscription(tenantId, plan_id, billing_cycle);

            res.status(200).json({
                success: true,
                message: 'Subscription upgraded successfully',
                data: updated
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Upgrade failed',
                error: error.message
            });
        }
    }

    // Admin only
    async createSubscription(req, res) {
        try {
            const subscription = await subscriptionService.createSubscription(req.body);
            res.status(201).json({
                success: true,
                data: subscription
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating subscription',
                error: error.message
            });
        }
    }

    async getUsage(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const usage = await subscriptionService.getUsage(tenantId);
            res.status(200).json({
                success: true,
                data: usage
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching usage',
                error: error.message
            });
        }
    }

    async cancelSubscription(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const cancelled = await subscriptionService.cancelSubscription(tenantId);
            res.status(200).json({
                success: true,
                message: 'Subscription cancelled successfully',
                data: cancelled
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Cancellation failed',
                error: error.message
            });
        }
    }

    async createOrder(req, res) {
        try {
            const { plan_id, billing_cycle } = req.body;
            const tenantId = req.user.tenant_id;
            const order = await subscriptionService.createRazorpayOrder(tenantId, plan_id, billing_cycle);
            res.status(200).json({
                success: true,
                data: order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating Razorpay order',
                error: error.message
            });
        }
    }

    async verifyPayment(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const result = await subscriptionService.verifyRazorpayPayment(tenantId, req.body);
            res.status(200).json({
                success: true,
                message: 'Payment verified and subscription updated.',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Payment verification failed',
                error: error.message
            });
        }
    }
}

module.exports = new SubscriptionController();
