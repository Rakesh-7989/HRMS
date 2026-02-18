const subscriptionService = require('./subscriptions.service');
const invoiceService = require('./invoice.service');
const mailer = require('../../config/mailer');
const db = require('../../middleware/db');

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
            const tenantId = req.user.tenantId;
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
            const tenantId = req.user.tenantId;
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
            const tenantId = req.user.tenantId;
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

    async getOrders(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const orders = await subscriptionService.getOrders(tenantId);
            res.status(200).json({
                success: true,
                data: orders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching orders',
                error: error.message
            });
        }
    }

    async cancelSubscription(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const cancelled = await subscriptionService.cancelSubscription(tenantId);
            res.status(200).json({
                success: true,
                message: 'Subscription will be cancelled at the end of the period.',
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
            const { plan_id, billing_cycle, quantity } = req.body;
            const tenantId = req.user.tenantId;
            const result = await subscriptionService.initiateSubscription(tenantId, plan_id, billing_cycle, quantity);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error initiating subscription',
                error: error.message
            });
        }
    }

    async verifyPayment(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const { order_id } = req.body;
            const result = await subscriptionService.verifyPayment(tenantId, order_id);
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

    async retryPayment(req, res) {
        try {
            const { invoiceId } = req.params;
            const invoice = await invoiceService.getInvoiceById(invoiceId);

            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }

            if (invoice.tenant_id !== req.user.tenantId) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            if (invoice.status === 'PAID') {
                return res.status(400).json({ success: false, message: 'Invoice is already paid' });
            }

            const paymentData = await invoiceService.generatePaymentLink(invoiceId);

            res.status(200).json({
                success: true,
                data: {
                    payment_session_id: paymentData.payment_session_id,
                    order_id: paymentData.order_id
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error retrying payment',
                error: error.message
            });
        }
    }

    // Administrative actions (Super Admin)
    async adminCancelSubscription(req, res) {
        try {
            const { tenantId } = req.params;
            const cancelled = await subscriptionService.cancelSubscription(tenantId, null);
            res.status(200).json({
                success: true,
                message: 'Subscription cancelled successfully by admin',
                data: cancelled
            });
        } catch (error) {
            // If it's already cancelled or not found, we can consider the job done
            if (error.message === 'No active subscription found to cancel.') {
                return res.status(200).json({
                    success: true,
                    message: 'Subscription is already cancelled or none was found.'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Administrative cancellation failed',
                error: error.message
            });
        }
    }

    async adminExtendSubscription(req, res) {
        try {
            const { tenantId } = req.params;
            const { days } = req.body;

            if (!days || isNaN(days)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid number of days is required for extension.'
                });
            }

            const extended = await subscriptionService.extendSubscription(tenantId, days);
            res.status(200).json({
                success: true,
                message: `Subscription extended by ${days} days`,
                data: extended
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Extension failed',
                error: error.message
            });
        }
    }

    async adminSuspendSubscription(req, res) {
        try {
            const { tenantId } = req.params;
            const suspended = await subscriptionService.suspendSubscription(tenantId);
            res.status(200).json({
                success: true,
                message: 'Subscription suspended successfully by admin',
                data: suspended
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Suspension failed',
                error: error.message
            });
        }
    }

    async adminEnableSubscription(req, res) {
        try {
            const { tenantId } = req.params;

            // 1. Check if tenant already has a subscription
            const existingSub = await subscriptionService.getSubscriptionByTenantId(tenantId);

            if (!existingSub || existingSub.status === 'EXPIRED') {
                // 2. Enable a 14-day trial (standard plan)
                await subscriptionService.createTrial(tenantId, null, null, 'MONTHLY');
            }

            // 3. Fetch tenant details to send enablement email
            const tenantRes = await db.query('SELECT name, email FROM tenants WHERE id = $1', [tenantId]);
            if (tenantRes.rowCount > 0) {
                const tenant = tenantRes.rows[0];
                await mailer.sendSubscriptionPricingEmail(tenant.email, tenant.name, tenantId);
            }

            res.status(200).json({
                success: true,
                message: '14-day trial enabled and pricing email sent successfully to the tenant.'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to enable subscription',
                error: error.message
            });
        }
    }

    async adminUpgradeSubscription(req, res) {
        try {
            const { tenantId } = req.params;
            const { planId, billingCycle } = req.body;

            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: 'Plan ID is required for upgrade.'
                });
            }

            const upgraded = await subscriptionService.upgradeSubscription(tenantId, planId, billingCycle || 'MONTHLY');
            res.status(200).json({
                success: true,
                message: 'Subscription upgraded successfully by admin',
                data: upgraded
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Upgrade failed',
                error: error.message
            });
        }
    }

    async adminGetBillingHistory(req, res) {
        try {
            const { tenantId } = req.params;
            const orders = await subscriptionService.getOrders(tenantId);
            res.status(200).json({
                success: true,
                data: orders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching billing history',
                error: error.message
            });
        }
    }

    async handleWebhook(req, res) {
        try {
            const { Cashfree } = require('cashfree-pg');
            const signature = req.headers["x-webhook-signature"];
            const timestamp = req.headers["x-webhook-timestamp"];
            // Cashfree signature verification needs original raw body for reliability
            const rawBody = JSON.stringify(req.body);

            try {
                Cashfree.PGWebhookVerifySignature(signature, rawBody, timestamp);
            } catch (err) {
                console.error('Cashfree Webhook Signature Verification Failed:', err.message);
                return res.status(400).json({ success: false, message: 'Invalid signature' });
            }

            const { type, data } = req.body;

            if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
                const order = data.order;
                const payment = data.payment;

                // Process the payment in service
                await subscriptionService.processWebhookPayment(order.order_id, payment.cf_payment_id);
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.status(500).json({ success: false, message: 'Webhook processing failed' });
        }
    }

    async getAllPlans(req, res) {
        try {
            const plans = await subscriptionService.getAllPlans();
            res.json({ status: "success", plans });
        } catch (err) {
            res.status(500).json({ status: "error", message: err.message });
        }
    }

    async updatePlan(req, res) {
        try {
            const updated = await subscriptionService.updatePlan(req.params.id, req.body);
            res.json({ status: "success", data: updated });
        } catch (err) {
            res.status(500).json({ status: "error", message: err.message });
        }
    }

    async createPlan(req, res) {
        try {
            const plan = await subscriptionService.createPlan(req.body);
            res.json({ status: "success", data: plan });
        } catch (err) {
            res.status(500).json({ status: "error", message: err.message });
        }
    }

    async deletePlan(req, res) {
        try {
            const deleted = await subscriptionService.deletePlan(req.params.id);
            if (!deleted) return res.status(404).json({ status: "error", message: "Plan not found" });
            res.json({ status: "success", data: deleted });
        } catch (err) {
            res.status(500).json({ status: "error", message: err.message });
        }
    }
}

module.exports = new SubscriptionController();
