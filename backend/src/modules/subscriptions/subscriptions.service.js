const db = require('../../middleware/db');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

class SubscriptionService {
    async getPlans(client = null) {
        const executor = client || db;
        const result = await executor.query('SELECT * FROM plans WHERE is_active = true ORDER BY price ASC');
        return result.rows;
    }

    async getSubscriptionByTenantId(tenantId, client = null) {
        const executor = client || db;
        const result = await executor.query(`
            SELECT s.*, p.name as plan_name, p.features, p.price as plan_price, p.max_employees
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1 AND s.status != 'CANCELLED'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [tenantId]);
        return result.rows[0];
    }

    async createSubscription(data, client = null) {
        const executor = client || db;
        const { tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date } = data;

        const result = await executor.query(`
            INSERT INTO subscriptions 
            (tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date]);

        return result.rows[0];
    }

    async upgradeSubscription(tenantId, planId, billingCycle, client = null) {
        const executor = client || db;
        const currentSubscription = await this.getSubscriptionByTenantId(tenantId, executor);

        if (!currentSubscription) {
            throw new Error('No active subscription found to upgrade.');
        }

        const result = await executor.query(`
            UPDATE subscriptions
            SET plan_id = $1, 
                billing_cycle = COALESCE($2, billing_cycle),
                status = 'ACTIVE',
                is_trial = false,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [planId, billingCycle, currentSubscription.id]);

        return result.rows[0];
    }

    async checkEmployeeLimit(tenantId, client = null) {
        const executor = client || db;

        // 1. Get current subscription and plan limit
        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);
        if (!subscription) return true; // Or throw error? Default to true for now

        const result = await executor.query('SELECT max_employees FROM plans WHERE id = $1', [subscription.plan_id]);
        const maxEmployees = result.rows[0]?.max_employees;

        if (maxEmployees === null) return true; // Unlimited

        // 2. Count current employees
        const countRes = await executor.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1', [tenantId]);
        const currentCount = parseInt(countRes.rows[0].count, 10);

        return currentCount < maxEmployees;
    }

    async createTrial(tenantId, client = null) {
        const executor = client || db;
        const plans = await this.getPlans(executor);
        const standardPlan = plans.find(p => p.name === 'STANDARD') || plans[0];

        if (!standardPlan) {
            throw new Error('Standard plan not found for trial creation.');
        }

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial

        return this.createSubscription({
            tenant_id: tenantId,
            plan_id: standardPlan.id,
            billing_cycle: 'MONTHLY',
            is_trial: true,
            status: 'TRIAL',
            trial_ends_at: trialEndsAt
        }, executor);
    }

    async getUsage(tenantId, client = null) {
        const executor = client || db;

        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);

        const countRes = await executor.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1', [tenantId]);
        const currentCount = parseInt(countRes.rows[0].count, 10);

        if (!subscription) {
            return {
                plan_name: 'NONE',
                max_employees: 0,
                current_employees: currentCount,
                is_trial: false,
                status: 'INACTIVE',
                trial_ends_at: null,
                end_date: null
            };
        }

        return {
            plan_name: subscription.plan_name,
            max_employees: subscription.max_employees,
            current_employees: currentCount,
            is_trial: subscription.is_trial,
            status: subscription.status,
            trial_ends_at: subscription.trial_ends_at,
            end_date: subscription.end_date
        };
    }

    async cancelSubscription(tenantId, client = null) {
        const executor = client || db;
        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);

        if (!subscription) {
            throw new Error('No active subscription found to cancel.');
        }

        const result = await executor.query(`
            UPDATE subscriptions
            SET status = 'CANCELLED',
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [subscription.id]);

        return result.rows[0];
    }

    async createRazorpayOrder(tenantId, planId, billingCycle) {
        // 1. Get plan details for amount
        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];

        if (!plan) {
            throw new Error('Plan not found.');
        }

        const amount = billingCycle === 'YEARLY' ? plan.price * 12 : plan.price;

        // 2. Create order in Razorpay
        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `receipt_${tenantId.substring(0, 8)}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        return {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        };
    }

    async verifyRazorpayPayment(tenantId, paymentData) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id, billing_cycle } = paymentData;

        // 1. Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            throw new Error('Invalid payment signature.');
        }

        // 2. Update subscription
        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
        const plan = planRes.rows[0];
        const amount = billing_cycle === 'YEARLY' ? plan.price * 12 : plan.price;

        const currentSubscription = await this.getSubscriptionByTenantId(tenantId);

        if (currentSubscription) {
            // Upgrade/Renew
            const result = await db.query(`
                UPDATE subscriptions
                SET plan_id = $1,
                    billing_cycle = $2,
                    status = 'ACTIVE',
                    is_trial = false,
                    last_payment_date = CURRENT_DATE,
                    amount_paid = $3,
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            `, [plan_id, billing_cycle, amount, currentSubscription.id]);
            return result.rows[0];
        } else {
            // New subscription (should normally exist as TRIAL from registration)
            return this.createSubscription({
                tenant_id: tenantId,
                plan_id: plan_id,
                billing_cycle: billing_cycle,
                is_trial: false,
                status: 'ACTIVE',
                amount_paid: amount
            });
        }
    }
}

module.exports = new SubscriptionService();
