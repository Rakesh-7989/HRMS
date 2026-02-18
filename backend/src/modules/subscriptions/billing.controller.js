const billingService = require('./billing.service');
const subscriptionService = require('./subscriptions.service');
const invoiceService = require('./invoice.service');

class BillingController {

    async getPlans(req, res) {
        try {
            const plans = await billingService.getPlans();
            res.status(200).json({ success: true, data: plans });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
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

            // Fetch real usage count
            const usage = await subscriptionService.getUsage(tenantId);

            res.status(200).json({
                success: true,
                data: {
                    ...subscription,
                    current_employees: usage.current_employees,
                    max_employees: usage.max_employees
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching subscription',
                error: error.message
            });
        }
    }

    async getInvoices(req, res) {
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
                message: 'Error fetching invoices',
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

    async createSubscription(req, res) {
        try {
            const tenantId = req.user.tenantId; // Assumes auth middleware populates this
            const { planId, priceId, quantity, successUrl, cancelUrl, couponCode } = req.body;

            const result = await billingService.createSubscription(tenantId, {
                planId,
                priceId,
                quantity,
                successUrl,
                cancelUrl,
                couponCode
            });

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            const signature = req.headers["x-webhook-signature"];
            const timestamp = req.headers["x-webhook-timestamp"];
            // Check if req.body is empty or not parsed correctly if using rawBody needed
            // For now assuming existing logic works or verifySignature needs rawBody
            const rawBody = JSON.stringify(req.body);

            // Cashfree sends payload in body
            const eventPayload = {
                id: req.body.event_id || req.headers["x-request-id"] || Date.now().toString(), // fallback
                type: req.body.type,
                data: req.body.data,
                signature: signature,
                timestamp: timestamp,
                rawBody: rawBody
            };

            const result = await billingService.processWebhook(eventPayload);
            res.status(200).json({ success: true, status: result?.status });
        } catch (error) {
            console.error('Webhook Error:', error);
            res.status(500).json({ success: false, message: 'Webhook failed' });
        }
    }
}

module.exports = new BillingController();
