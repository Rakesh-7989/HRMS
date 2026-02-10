const db = require('../../middleware/db');
const cashfreeService = require('./cashfree.service');
const invoiceService = require('./invoice.service');
const crypto = require('crypto');

class BillingService {

    /**
     * Get all available plans
     */
    async getPlans() {
        const plans = await db.query(`
            SELECT p.*, 
                   json_agg(json_build_object(
                       'id', pp.id,
                       'interval', pp.interval,
                       'unit_amount', pp.unit_amount,
                       'currency', pp.currency
                   )) as prices 
            FROM plans p 
            LEFT JOIN plan_prices pp ON p.id = pp.plan_id
            WHERE p.is_active = true AND pp.is_active = true
            GROUP BY p.id
            ORDER BY p.tier ASC
        `);
        return plans.rows;
    }

    /**
     * Initialize a new subscription for a tenant
     */
    async createSubscription(tenantId, { planId, priceId, quantity = 1, successUrl, cancelUrl, couponCode }) {
        // 1. Get Plan & Price Details
        const priceRes = await db.query('SELECT * FROM plan_prices WHERE id = $1', [priceId]);
        if (priceRes.rowCount === 0) throw new Error('Invalid Price ID');
        const price = priceRes.rows[0];

        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];

        // 1.5 Handle Coupon
        let discountAmount = 0;
        let finalAmount = price.unit_amount * quantity;
        let coupon = null;

        if (couponCode) {
            const couponService = require('./coupon.service');
            try {
                coupon = await couponService.validateCoupon(couponCode);
                discountAmount = couponService.calculateDiscount(coupon, finalAmount);
                finalAmount = Math.max(0, finalAmount - discountAmount);
            } catch (error) {
                console.warn('Invalid Coupon:', error.message);
                // We can either throw or ignore. Let's ignore for robustness but ideally notify user.
                // For now, if invalid, just proceed without discount.
            }
        }

        // 2. Prepare Cashfree Subscription Metadata
        // Use unique plan ID if discounted
        const basePlanId = `${plan.code}_${price.interval}`;
        const cashfreePlanId = coupon ? `${basePlanId}_OFF_${coupon.code}` : basePlanId;

        // Ensure Plan exists in Cashfree
        try {
            await cashfreeService.createPlan({
                plan_id: cashfreePlanId,
                plan_name: coupon ? `${plan.name} ${price.interval} (Disc)` : `${plan.name} ${price.interval}`,
                amount: finalAmount,
                interval_type: this.mapIntervalToCashfree(price.interval),
                intervals: 1,
                description: `${quantity} seats ${coupon ? `w/ ${coupon.code}` : ''}`
            });
        } catch (e) {
            console.log('Plan creation warning (might exist):', e.message);
        }

        const subscriptionId = `SUB_${Date.now()}_${tenantId.substring(0, 8)}`;

        // 3. Create Subscription in DB (Pending state)
        const existingSub = await db.query('SELECT id FROM subscriptions WHERE tenant_id = $1 AND status != \'CANCELLED\'', [tenantId]);
        let subDbId;

        if (existingSub.rowCount > 0) {
            subDbId = existingSub.rows[0].id;
            // Update existing sub pending details
            await db.query(`
                UPDATE subscriptions 
                SET plan_id = $1, cashfree_subscription_id = $2, status = 'PENDING_PAYMENT'
                WHERE id = $3
             `, [planId, subscriptionId, subDbId]);
        } else {
            const newSub = await db.query(`
                INSERT INTO subscriptions (tenant_id, plan_id, status, cashfree_subscription_id)
                VALUES ($1, $2, 'PENDING_PAYMENT', $3)
                RETURNING id
             `, [tenantId, planId, subscriptionId]);
            subDbId = newSub.rows[0].id;
        }

        // Add Item
        // Clear old items first? Yes, for clean state.
        await db.query('DELETE FROM subscription_items WHERE subscription_id = $1', [subDbId]);

        await db.query(`
            INSERT INTO subscription_items (subscription_id, price_id, quantity)
            VALUES ($1, $2, $3)
        `, [subDbId, priceId, quantity]);

        // Record Coupon Usage if applied
        if (coupon) {
            const couponService = require('./coupon.service');
            await couponService.incrementUsage(coupon.id);
            // Optionally store coupon_id in subscription for reference
        }


        // 4. Call Cashfree to get Auth Link
        // Fetch Tenant User info
        const userRes = await db.query('SELECT email, first_name, last_name, phone FROM users WHERE tenant_id = $1 AND role = \'ADMIN\' LIMIT 1', [tenantId]);
        const admin = userRes.rows[0];

        const cfResponse = await cashfreeService.createSubscription({
            subscriptionId: subscriptionId,
            planId: cashfreePlanId,
            customerEmail: admin.email,
            customerPhone: admin.phone || '9999999999',
            customerName: admin.first_name,
            returnUrl: successUrl || `${process.env.FRONTEND_URL}/billing/success?sub_id=${subscriptionId}`
        });

        return {
            subscriptionId: subDbId,
            cashfreeId: subscriptionId,
            authLink: cfResponse.authLink
        };
    }

    async processWebhook(event) {
        // 1. Check Idempotency
        const existingEvent = await db.query('SELECT id FROM webhook_events WHERE provider = $1 AND event_id = $2', ['CASHFREE', event.id]);
        if (existingEvent.rowCount > 0) return { status: 'DUPLICATE' };

        // 2. Save Event
        const validSignature = cashfreeService.verifySignature(event.signature, event.rawBody, event.timestamp);
        if (!validSignature) throw new Error('Invalid Webhook Signature');

        await db.query(`
            INSERT INTO webhook_events (provider, event_id, event_type, payload, status)
            VALUES ($1, $2, $3, $4, 'PROCESSING')
        `, ['CASHFREE', event.id, event.type, event.data]);

        // 3. Handle Event Type
        try {
            switch (event.type) {
                case 'SUBSCRIPTION_ACTIVATED':
                case 'SUBSCRIPTION.ACTIVATED':
                    await this.handleSubscriptionActivated(event.data);
                    break;
                case 'PAYMENT_SUCCESS_WEBHOOK':
                case 'PAYMENT.SUCCESS':
                    await this.handlePaymentSuccess(event.data);
                    break;
                case 'PAYMENT_FAILED_WEBHOOK':
                case 'PAYMENT.FAILED':
                    await this.handlePaymentFailed(event.data);
                    break;
                case 'SUBSCRIPTION_CANCELLED':
                    await this.handleSubscriptionCancelled(event.data);
                    break;
                default:
                    console.log('Unhandled Webhook Type:', event.type);
            }
            // Update Status
            await db.query('UPDATE webhook_events SET status = \'PROCESSED\', processed_at = NOW() WHERE event_id = $1', [event.id]);
        } catch (error) {
            console.error('Webhook Processing Failed:', error);
            await db.query('UPDATE webhook_events SET status = \'FAILED\', processing_error = $2 WHERE event_id = $1', [event.id, error.message]);
            throw error;
        }
    }

    async handleSubscriptionActivated(data) {
        const subId = data.subscription?.subscription_id || data.subscription_id;
        const cfSubId = data.cf_subscription_id;

        // Activate in DB
        // Assuming subscription_id matches our DB UUID (or we mapped it via metadata/reference)
        // If subId is external, we need to find internal ID.
        // In createSubscription, we stored cashfree_subscription_id = subId

        await db.query(`
            UPDATE subscriptions 
            SET status = 'ACTIVE', 
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '1 month', -- Should get from webhook or plan duration
                updated_at = NOW()
            WHERE cashfree_subscription_id = $1
        `, [subId]);
    }

    async handlePaymentSuccess(data) {
        // Find subscription or order
        const subId = data.order?.order_id; // If purely sub payment, it might be sub reference
        // Cashfree payload structure varies between PG and Subscriptions. 
        // For Subscriptions: event often has subscription_id

        const cfSubId = data.subscription_reference_id; // Check actual payload structure

        if (cfSubId) {
            // Extend validity
            await db.query(`
                UPDATE subscriptions 
                SET status = 'ACTIVE', 
                    last_payment_date = NOW(),
                    current_period_end = current_period_end + INTERVAL '1 month', -- Simplified, should use interval
                    updated_at = NOW()
                WHERE cashfree_subscription_id = $1
            `, [cfSubId]);

            // Create Invoice/Payment Record
            // ...
        }
    }

    async handlePaymentFailed(data) {
        const cfSubId = data.subscription_reference_id;
        if (cfSubId) {
            await db.query(`
                UPDATE subscriptions 
                SET status = 'PAST_DUE', 
                    updated_at = NOW()
                WHERE cashfree_subscription_id = $1
            `, [cfSubId]);
        }
    }
}

module.exports = new BillingService();
