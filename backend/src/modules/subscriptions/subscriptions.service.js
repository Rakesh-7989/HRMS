const db = require('../../middleware/db');
const cashfreeService = require('./cashfree.service');
const invoiceService = require('./invoice.service');
const crypto = require('crypto');

class SubscriptionService {
    /**
     * Get all available plans with their active prices
     */
    async getPlans() {
        const plans = await db.query(`
            SELECT p.*, 
                   json_agg(json_build_object(
                       'id', pp.id,
                       'interval', pp.interval,
                       'unit_amount', pp.unit_amount,
                       'currency', pp.currency,
                       'interval_count', pp.interval_count
                   )) as prices 
            FROM plans p 
            LEFT JOIN plan_prices pp ON p.id = pp.plan_id
            WHERE p.is_active = true AND (pp.is_active = true OR pp.id IS NULL)
            GROUP BY p.id
            ORDER BY p.tier ASC
        `);
        return plans.rows;
    }

    /**
     * Get active subscription for a tenant including plan details
     */
    async getSubscriptionByTenantId(tenantId) {
        const result = await db.query(`
            SELECT s.*, p.name as plan_name, p.features, p.max_employees, p.tier as plan_tier
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1 AND s.status != 'EXPIRED'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [tenantId]);
        return result.rows[0];
    }

    /**
     * Get organization usage and limits
     */
    async getUsage(tenantId) {
        const sub = await this.getSubscriptionByTenantId(tenantId);
        const countRes = await db.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND is_deleted = false', [tenantId]);
        const currentCount = parseInt(countRes.rows[0].count, 10);

        return {
            plan_name: sub?.plan_name || 'NONE',
            max_employees: sub?.max_employees || 0,
            current_employees: currentCount,
            status: sub?.status || 'INACTIVE',
            end_date: sub?.current_period_end || sub?.end_date,
            is_trial: sub?.is_trial || false
        };
    }

    /**
     * Check if organization can add another employee based on plan limits
     */
    async checkEmployeeLimit(tenantId) {
        const usage = await this.getUsage(tenantId);
        if (usage.max_employees === 0 && usage.plan_name === 'NONE') return false;
        if (usage.max_employees === null) return true; // Unlimited
        return usage.current_employees < usage.max_employees;
    }

    /**
     * Initiate a new subscription (or upgrade) for a tenant
     * This follows the modern 'billing' logic with Cashfree integration
     */
    async initiateSubscription(tenantId, { planId, priceId, quantity = 1, successUrl, couponCode }) {
        // 1. Get Plan & Price Details
        const priceRes = await db.query('SELECT * FROM plan_prices WHERE id = $1', [priceId]);
        if (priceRes.rowCount === 0) throw new Error('Invalid Price ID');
        const price = priceRes.rows[0];

        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];

        // 2. Handle Coupon
        let discountAmount = 0;
        let finalAmount = parseFloat(price.unit_amount) * quantity;
        let coupon = null;

        if (couponCode) {
            const couponService = require('./coupon.service');
            try {
                coupon = await couponService.validateCoupon(couponCode);
                discountAmount = couponService.calculateDiscount(coupon, finalAmount);
                finalAmount = Math.max(0, finalAmount - discountAmount);
            } catch (error) {
                console.warn('Invalid Coupon:', error.message);
            }
        }

        // 3. Prepare Cashfree Sync
        const basePlanId = `${plan.code}_${price.interval}`;
        const cashfreePlanId = coupon ? `${basePlanId}_OFF_${coupon.code}` : basePlanId;

        if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
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
                console.log('Cashfree Plan sync warning:', e.message);
            }
        }

        const cfSubscriptionId = `SUB_${Date.now()}_${tenantId.substring(0, 8)}`;

        // 4. Upsert Subscription in DB
        const existingSub = await db.query('SELECT id FROM subscriptions WHERE tenant_id = $1 AND status != \'EXPIRED\'', [tenantId]);
        let subDbId;

        if (existingSub.rowCount > 0) {
            subDbId = existingSub.rows[0].id;
            await db.query(`
                UPDATE subscriptions 
                SET plan_id = $1, cashfree_subscription_id = $2, status = 'PENDING_PAYMENT', updated_at = NOW()
                WHERE id = $3
             `, [planId, cfSubscriptionId, subDbId]);
        } else {
            const newSub = await db.query(`
                INSERT INTO subscriptions (tenant_id, plan_id, status, cashfree_subscription_id)
                VALUES ($1, $2, 'PENDING_PAYMENT', $3)
                RETURNING id
             `, [tenantId, planId, cfSubscriptionId]);
            subDbId = newSub.rows[0].id;
        }

        // 5. Update Items
        await db.query('DELETE FROM subscription_items WHERE subscription_id = $1', [subDbId]);
        await db.query(`
            INSERT INTO subscription_items (subscription_id, price_id, quantity)
            VALUES ($1, $2, $3)
        `, [subDbId, priceId, quantity]);

        // 6. Get Auth Link from Cashfree
        let authLink = null;
        let useMock = true;

        if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
            try {
                const adminRes = await db.query(`
                    SELECT u.email, e.first_name, e.last_name, e.phone 
                    FROM users u 
                    LEFT JOIN employees e ON e.user_id = u.id 
                    WHERE u.tenant_id = $1 AND u.role = 'ADMIN' LIMIT 1
                `, [tenantId]);
                const admin = adminRes.rows[0];

                const cfResponse = await cashfreeService.createSubscription({
                    subscriptionId: cfSubscriptionId,
                    planId: cashfreePlanId,
                    customerEmail: admin.email,
                    customerPhone: admin.phone || '9999999999',
                    customerName: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin',
                    returnUrl: successUrl || `${process.env.FRONTEND_URL}/billing`
                });
                authLink = cfResponse.authLink;
                useMock = false;
            } catch (e) {
                console.warn('Cashfree Subscription creation failed, using mock path:', e.message);
            }
        }

        if (useMock) {
            // Dev/Mock bypass: Auto-activation if no keys
            if (!process.env.CASHFREE_APP_ID) {
                await db.query(`
                    UPDATE subscriptions 
                    SET status = 'ACTIVE', 
                        current_period_start = NOW(),
                        current_period_end = NOW() + INTERVAL '1 month',
                        is_trial = false
                    WHERE id = $1
                `, [subDbId]);
            }
            authLink = successUrl || `${process.env.FRONTEND_URL}/billing`;
        }

        return {
            subscriptionId: subDbId,
            cashfreeId: cfSubscriptionId,
            authLink
        };
    }

    /**
     * Webhook Processing Logic
     */
    async processWebhook(event) {
        const existingEvent = await db.query('SELECT id FROM webhook_events WHERE provider = $1 AND event_id = $2', ['CASHFREE', event.id]);
        if (existingEvent.rowCount > 0) return { status: 'DUPLICATE' };

        const validSignature = cashfreeService.verifySignature(event.signature, event.rawBody, event.timestamp);
        if (!validSignature) throw new Error('Invalid Webhook Signature');

        await db.query(`
            INSERT INTO webhook_events (provider, event_id, event_type, payload, status)
            VALUES ($1, $2, $3, $4, 'PROCESSING')
        `, ['CASHFREE', event.id, event.type, event.data]);

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
            }
            await db.query('UPDATE webhook_events SET status = \'PROCESSED\', processed_at = NOW() WHERE event_id = $1', [event.id]);
        } catch (error) {
            await db.query('UPDATE webhook_events SET status = \'FAILED\', processing_error = $2 WHERE event_id = $1', [event.id, error.message]);
            throw error;
        }
    }

    async handleSubscriptionActivated(data) {
        const subId = data.subscription?.subscription_id || data.subscription_id;
        await db.query(`
            UPDATE subscriptions 
            SET status = 'ACTIVE', 
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '1 month',
                updated_at = NOW()
            WHERE cashfree_subscription_id = $1
        `, [subId]);
    }

    async handlePaymentSuccess(data) {
        const cfSubId = data.subscription_reference_id;
        if (cfSubId) {
            await db.query(`
                UPDATE subscriptions 
                SET status = 'ACTIVE', 
                    last_payment_date = NOW(),
                    current_period_end = current_period_end + INTERVAL '1 month',
                    updated_at = NOW()
                WHERE cashfree_subscription_id = $1
            `, [cfSubId]);
        }
    }

    async handlePaymentFailed(data) {
        const cfSubId = data.subscription_reference_id;
        if (cfSubId) {
            await db.query(`UPDATE subscriptions SET status = 'PAST_DUE', updated_at = NOW() WHERE cashfree_subscription_id = $1`, [cfSubId]);
        }
    }

    async handleSubscriptionCancelled(data) {
        const subId = data.subscription?.subscription_id || data.subscription_id;
        if (subId) {
            await db.query(`UPDATE subscriptions SET status = 'CANCELLED', updated_at = NOW() WHERE cashfree_subscription_id = $1`, [subId]);
        }
    }

    /**
     * Billing history / Invoices
     */
    async getInvoices(tenantId) {
        const result = await db.query(`
            SELECT i.*, p.name as plan_name
            FROM invoices i
            LEFT JOIN plans p ON i.plan_id = p.id
            WHERE i.tenant_id = $1
            ORDER BY i.created_at DESC
        `, [tenantId]);
        return result.rows;
    }

    /**
     * Admin methods for Plan Management
     */
    async createPlan(data) {
        const { name, code, tier, features, max_employees, setup_fee = 0 } = data;
        const res = await db.query(`
            INSERT INTO plans (name, code, tier, features, max_employees, setup_fee, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING *
        `, [name, code, tier, JSON.stringify(features), max_employees, setup_fee]);
        return res.rows[0];
    }

    async updatePlan(id, data) {
        const { name, features, max_employees, is_active } = data;
        const res = await db.query(`
            UPDATE plans 
            SET name = $1, features = $2, max_employees = $3, is_active = $4, updated_at = NOW()
            WHERE id = $5 RETURNING *
        `, [name, JSON.stringify(features), max_employees, is_active, id]);
        return res.rows[0];
    }

    async getAllPlans() {
        const plans = await db.query(`
            SELECT p.*, 
                   json_agg(json_build_object(
                       'id', pp.id,
                       'interval', pp.interval,
                       'unit_amount', pp.unit_amount,
                       'currency', pp.currency,
                       'interval_count', pp.interval_count
                   )) as prices 
            FROM plans p 
            LEFT JOIN plan_prices pp ON p.id = pp.plan_id AND pp.is_active = true
            GROUP BY p.id
            ORDER BY p.tier ASC
        `);
        return plans.rows;
    }

    async deletePlan(id) {
        const res = await db.query(`
            UPDATE plans SET is_active = false, updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id]);
        if (res.rowCount === 0) throw new Error('Plan not found');
        return res.rows[0];
    }

    mapIntervalToCashfree(interval) {
        const map = {
            'MONTHLY': 'MONTH',
            'YEARLY': 'YEAR',
            'QUARTERLY': 'QUARTER',
            'HALF_YEARLY': 'HALF_YEAR'
        };
        return map[interval.toUpperCase()] || 'MONTH';
    }
}

module.exports = new SubscriptionService();
