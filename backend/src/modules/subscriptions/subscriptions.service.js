const db = require('../../middleware/db');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

class SubscriptionService {
    async getPlans(client = null) {
        const executor = client || db;
        // Fetch plans
        const plansRes = await executor.query('SELECT * FROM plans WHERE is_active = true ORDER BY price ASC');
        const plans = plansRes.rows;

        // Fetch variations for these plans
        if (plans.length > 0) {
            const planIds = plans.map(p => p.id);
            const variationsRes = await executor.query(
                'SELECT * FROM plan_variations WHERE plan_id = ANY($1) AND is_active = true ORDER BY duration_months ASC',
                [planIds]
            );
            const variations = variationsRes.rows;

            // Attach variations to plans
            plans.forEach(plan => {
                plan.variations = variations.filter(v => v.plan_id === plan.id);
            });
        }

        return plans;
    }

    async getSubscriptionByTenantId(tenantId, client = null) {
        const executor = client || db;
        const result = await executor.query(`
            SELECT s.*, p.name as plan_name, p.features, p.max_employees
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
        const { tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid } = data;

        const result = await executor.query(`
            INSERT INTO subscriptions 
            (tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid, last_payment_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 > 0 THEN CURRENT_DATE ELSE NULL END)
            RETURNING *
        `, [tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid || 0]);

        return result.rows[0];
    }

    async upgradeSubscription(tenantId, planId, billingCycle, client = null) {
        // Only updates status/metadata, actual payment verification handles the heavy lifting
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
        if (!subscription) return true;

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

    /**
     * Calculates the total price including GST and setup fee.
     * Logic aligned with: Unit Price * Quantity * Months
     */
    async calculatePrice(planId, billingCycle, quantity = 1, isNewSubscription = false) {
        // Fetch Plan and Variation
        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];

        if (!plan) throw new Error('Plan not found.');

        const variationRes = await db.query(
            'SELECT * FROM plan_variations WHERE plan_id = $1 AND frequency = $2',
            [planId, billingCycle]
        );
        const variation = variationRes.rows[0];

        if (!variation) throw new Error(`Pricing not found for ${billingCycle} cycle.`);

        // 1. Calculate Base Subscription Amount
        // Formula: Unit Price * Quantity * Duration(Months)
        // Note: The screenshot implies unit price is per month per user.
        // e.g. Standard Yearly: 45 * 1 * 12 = 540.
        const unitPrice = parseFloat(variation.unit_price);
        const durationMonths = variation.duration_months;
        const gstPercent = parseFloat(variation.gst_percentage);

        const baseSubscriptionAmount = unitPrice * quantity * durationMonths;

        // 2. Setup Fee (One-time)
        // Only apply if it's a new subscription or explicitly requested (logic can be refined)
        // For now, assuming if isNewSubscription is true, we add it.
        // Or if the plan has a setup fee and it's their first time paying for it.
        let setupFee = 0;
        if (isNewSubscription && plan.setup_fee) {
            setupFee = parseFloat(plan.setup_fee);
        }

        // 3. Calculate GST
        // GST is applied to (Base Amount + Setup Fee)
        // Example from screenshot: 
        // Premium Yearly: 720 (Base) -> GST 129.6 (18%) -> Total 849.60
        // Setup Fee is separate line in screenshot but usually part of total invoice.
        // Premium setup: 1000 -> GST 180 -> Total 1180.

        const taxableAmount = baseSubscriptionAmount + setupFee;
        const gstAmount = (taxableAmount * gstPercent) / 100;
        const totalAmount = taxableAmount + gstAmount;

        return {
            unit_price: unitPrice,
            duration_months: durationMonths,
            base_subscription_amount: baseSubscriptionAmount,
            setup_fee: setupFee,
            gst_percentage: gstPercent,
            gst_amount: gstAmount,
            total_amount: totalAmount,
            currency: 'INR'
        };
    }

    async createRazorpayOrder(tenantId, planId, billingCycle) {
        // Check if tenant already has paid subscription to decide on setup fee
        // This is a naive check. In production, check transaction history.
        const existingSub = await this.getSubscriptionByTenantId(tenantId);
        const isNewSubscription = !existingSub || existingSub.is_trial;

        // Default quantity 1 for SaaS (Tenant license)
        // If per-user pricing is strictly enforced, we'd need employee count here.
        // Assuming 1 license = 1 tenant for now based on 'QTY 1' in screenshot.
        const quantity = 1;

        const pricing = await this.calculatePrice(planId, billingCycle, quantity, isNewSubscription);

        // Create order in Razorpay
        const options = {
            amount: Math.round(pricing.total_amount * 100), // Razorpay expects paisa
            currency: pricing.currency,
            receipt: `receipt_${tenantId.substring(0, 8)}_${Date.now()}`,
            notes: {
                plan_id: planId,
                billing_cycle: billingCycle,
                setup_fee: pricing.setup_fee > 0 ? 'Included' : 'None'
            }
        };

        const order = await razorpay.orders.create(options);
        return {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            pricing_details: pricing // Send breakdown to frontend for display
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

        // 2. Recalculate to confirm what was paid (or trust the order amount if stored)
        // For simplicity, we assume the frontend passed correct params and user paid the Order amount.

        // Fetch Order details if needed from Razorpay, but we'll proceed to update DB.

        // Calculate validity
        const variationRes = await db.query(
            'SELECT duration_months FROM plan_variations WHERE plan_id = $1 AND frequency = $2',
            [plan_id, billing_cycle]
        );
        const durationMonths = variationRes.rows[0]?.duration_months || 1;

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

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
                    end_date = $3,
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            `, [plan_id, billing_cycle, endDate, currentSubscription.id]);
            return result.rows[0];
        } else {
            // New subscription
            return this.createSubscription({
                tenant_id: tenantId,
                plan_id: plan_id,
                billing_cycle: billing_cycle,
                is_trial: false,
                status: 'ACTIVE',
                amount_paid: 0, // Should nominally track this from payment, but omitted for now
                end_date: endDate
            });
        }
    }
}

module.exports = new SubscriptionService();

