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
            const tenantId = req.user?.tenantId; // Might be null for registration completion
            const { order_id } = req.body;
            const result = await subscriptionService.verifyPayment(tenantId, order_id);
            res.status(200).json({
                success: true,
                message: 'Payment verified and subscription activated. Check your email for login credentials.',
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
            const { planId, days } = req.body;

            const trialDays = days || 30;

            let targetPlanId = planId;
            if (!targetPlanId) {
                const standardPlan = await db.query("SELECT id FROM plans WHERE name = 'STANDARD' LIMIT 1");
                if (standardPlan.rowCount > 0) {
                    targetPlanId = standardPlan.rows[0].id;
                }
            }

            if (!targetPlanId) throw new Error('Default plan (STANDARD) not found for enablement.');

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + trialDays);

            // Create a new subscription record
            await subscriptionService.createSubscription({
                tenant_id: tenantId,
                plan_id: targetPlanId,
                billing_cycle: 'MONTHLY',
                is_trial: true,
                status: 'ACTIVE',
                trial_ends_at: null,
                end_date: endDate,
                amount_paid: 0,
                coupon_code: null
            });

            // Update tenants table to reflect active plan
            const planTierRes = await db.query('SELECT tier FROM plans WHERE id = $1', [targetPlanId]);
            const tier = planTierRes.rows[0]?.tier || 1;

            await db.query(`
                UPDATE tenants
                SET plan_type = $1,
                    plan_expiry_date = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, [tier, endDate, tenantId]);

            // Fetch tenant details to send enablement email (Send Pricing)
            const tenantRes = await db.query('SELECT name, email FROM tenants WHERE id = $1', [tenantId]);
            if (tenantRes.rowCount > 0) {
                const tenant = tenantRes.rows[0];
                try {
                    await mailer.sendSubscriptionPricingEmail(tenant.email, tenant.name, tenantId);
                } catch (emailError) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to send pricing email:', emailError.message);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Subscription enabled successfully.'
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

    /**
     * Public endpoint: Initiate payment for a pending-payment tenant.
     * Used when a tenant with incomplete payment tries to login or retry.
     */
    async initiatePaymentForTenant(req, res) {
        try {
            const { tenant_id, email } = req.body;

            if (!tenant_id || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'tenant_id and email are required'
                });
            }

            // Verify that this email belongs to this tenant (security check)
            const tenantRes = await db.query(
                'SELECT id, email, is_active, employee_count FROM tenants WHERE id = $1 AND LOWER(email) = LOWER($2)',
                [tenant_id, email]
            );

            if (tenantRes.rowCount === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid tenant or email combination'
                });
            }

            const tenant = tenantRes.rows[0];

            // Verify the subscription is actually pending payment
            const subscription = await subscriptionService.getSubscriptionByTenantId(tenant_id);
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'No subscription found for this tenant. Please register first.'
                });
            }

            if (subscription.status !== 'PENDING_PAYMENT' && subscription.status !== 'PAST_DUE' && subscription.status !== 'TRIAL') {
                return res.status(400).json({
                    success: false,
                    message: 'This account already has an active or completed billing status.'
                });
            }

            // Initiate a new payment session with the correct employee count
            const result = await subscriptionService.initiateSubscription(
                tenant_id,
                subscription.plan_id,
                subscription.billing_cycle || 'MONTHLY',
                tenant.employee_count || 1
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Initiate payment for tenant error:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating payment session',
                error: error.message
            });
        }
    }

    async getUpiQr(req, res) {
        try {
            const { order_id } = req.body;

            if (!order_id) {
                return res.status(400).json({
                    success: false,
                    message: 'order_id is required'
                });
            }

            const result = await invoiceService.generateUpiQr(order_id);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    upi_qr_code: result.upi_qr_code,
                    order_id: result.order_id
                }
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Get UPI QR error:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating UPI QR code',
                error: error.message
            });
        }
    }

    async handleWebhook(req, res) {
        try {
            const cashfree = require('../../config/cashfree');
            const signature = req.headers["x-webhook-signature"];
            const timestamp = req.headers["x-webhook-timestamp"];
            // Cashfree signature verification needs original raw body for reliability
            const rawBody = JSON.stringify(req.body);

            try {
                cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
            } catch (err) {
                // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
            console.error('Webhook processing error:', error);
            res.status(500).json({ success: false, message: 'Webhook processing failed' });
        }
    }
}

module.exports = new SubscriptionController();
