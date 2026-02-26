const subscriptionService = require('./subscriptions.service');
const couponService = require('./coupon.service');

class SubscriptionController {
    /**
     * Get all available subscription plans
     */
    async getPlans(req, res) {
        try {
            const plans = await subscriptionService.getPlans();
            res.json({ success: true, data: plans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get current subscription and usage for the logged-in tenant
     */
    async getMySubscription(req, res) {
        try {
            const usage = await subscriptionService.getUsage(req.user.tenantId);
            res.json({ success: true, data: usage });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Initiate a new subscription or upgrade
     */
    async createSubscription(req, res) {
        try {
            const { planId, priceId, quantity, successUrl, couponCode } = req.body;
            const result = await subscriptionService.initiateSubscription(req.user.tenantId, {
                planId,
                priceId,
                quantity,
                successUrl,
                couponCode
            });
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get billing history / invoices
     */
    async getInvoices(req, res) {
        try {
            const invoices = await subscriptionService.getInvoices(req.user.tenantId);
            res.json({ success: true, data: invoices });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Handle Cashfree webhooks
     */
    async handleWebhook(req, res) {
        try {
            const signature = req.headers["x-webhook-signature"];
            const timestamp = req.headers["x-webhook-timestamp"];
            const rawBody = JSON.stringify(req.body);

            const event = {
                id: req.body.event_id || Date.now().toString(),
                type: req.body.type,
                data: req.body.data,
                signature,
                timestamp,
                rawBody
            };

            await subscriptionService.processWebhook(event);
            res.json({ success: true });
        } catch (error) {
            console.error('Webhook Error:', error.message);
            res.status(500).json({ success: false, message: 'Webhook processing failed' });
        }
    }

    /**
     * Validate a coupon code
     */
    async validateCoupon(req, res) {
        try {
            const { code } = req.body;
            const coupon = await couponService.validateCoupon(code);
            res.json({ success: true, data: coupon });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Get organization usage details
     */
    async getUsage(req, res) {
        try {
            const usage = await subscriptionService.getUsage(req.user.tenantId);
            res.json({ success: true, data: usage });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- Admin Methods ---

    async adminCreatePlan(req, res) {
        try {
            const plan = await subscriptionService.createPlan(req.body);
            res.status(201).json({ success: true, data: plan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async adminUpdatePlan(req, res) {
        try {
            const plan = await subscriptionService.updatePlan(req.params.id, req.body);
            res.json({ success: true, data: plan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async adminGetPlans(req, res) {
        try {
            const plans = await subscriptionService.getAllPlans();
            res.json({ success: true, plans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async adminDeletePlan(req, res) {
        try {
            await subscriptionService.deletePlan(req.params.id);
            res.json({ success: true, message: 'Plan deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new SubscriptionController();
