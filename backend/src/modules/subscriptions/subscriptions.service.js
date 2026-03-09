const db = require('../../middleware/db');
const cashfree = require('../../config/cashfree');
const crypto = require('crypto');
const invoiceService = require('./invoice.service');

class SubscriptionService {
    async getPlans(client = null) {
        const executor = client || db;
        // Fetch plans (Standard, Premium, Elite, Custom)
        const plansRes = await executor.query('SELECT * FROM plans WHERE is_active = true ORDER BY setup_fee ASC');
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
            WHERE s.tenant_id = $1 AND s.status != 'EXPIRED'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [tenantId]);
        return result.rows[0];
    }

    async createSubscription(data, client = null) {
        const executor = client || db;
        const { tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid, coupon_code } = data;

        const result = await executor.query(`
            INSERT INTO subscriptions 
            (tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid, last_payment_date, coupon_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::numeric, CASE WHEN $8::numeric > 0 THEN CURRENT_DATE ELSE NULL END, $9)
            RETURNING *
        `, [tenant_id, plan_id, billing_cycle, is_trial, status, trial_ends_at, end_date, amount_paid || 0, coupon_code || null]);

        return result.rows[0];
    }

    async createTrial(tenantId, client = null, planId = null, billingCycle = 'MONTHLY') {
        const executor = client || db;

        let targetPlanId = planId;
        if (!targetPlanId) {
            const standardPlan = await executor.query("SELECT id FROM plans WHERE name = 'STANDARD' LIMIT 1");
            if (standardPlan.rowCount > 0) {
                targetPlanId = standardPlan.rows[0].id;
            }
        }

        if (!targetPlanId) throw new Error('Default plan (STANDARD) not found for trial creation.');

        const trialDays = 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        const subscription = await this.createSubscription({
            tenant_id: tenantId,
            plan_id: targetPlanId,
            billing_cycle: billingCycle,
            is_trial: true,
            status: 'TRIAL',
            trial_ends_at: trialEndsAt,
            amount_paid: 0,
            coupon_code: null
        }, executor);

        // Sync to tenants table
        const planTierRes = await executor.query('SELECT tier FROM plans WHERE id = $1', [targetPlanId]);
        const tier = planTierRes.rows[0]?.tier || 1;

        await executor.query(`
            UPDATE tenants
            SET plan_type = $1,
                plan_expiry_date = $2,
                updated_at = NOW()
            WHERE id = $3
        `, [tier, trialEndsAt, tenantId]);

        return subscription;
    }

    /**
     * Create a pending subscription for users who selected a paid plan.
     * This is NOT a trial - it awaits payment confirmation.
     */
    async createPendingSubscription(tenantId, client = null, planId, billingCycle = 'MONTHLY', couponCode = null) {
        const executor = client || db;

        if (!planId) throw new Error('Plan ID is required for paid subscription.');

        // Calculate end date based on billing cycle
        const durationMonths = billingCycle === 'YEARLY' ? 12 :
            billingCycle === 'HALF_YEARLY' ? 6 :
                billingCycle === 'QUARTERLY' ? 3 : 1;

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const subscription = await this.createSubscription({
            tenant_id: tenantId,
            plan_id: planId,
            billing_cycle: billingCycle,
            is_trial: false,
            status: 'PENDING_PAYMENT',
            trial_ends_at: null,
            end_date: endDate,
            amount_paid: 0,
            coupon_code: couponCode
        }, executor);

        // Sync to tenants table
        const planTierRes = await executor.query('SELECT tier FROM plans WHERE id = $1', [planId]);
        const tier = planTierRes.rows[0]?.tier || 1;

        await executor.query(`
            UPDATE tenants
            SET plan_type = $1,
                plan_expiry_date = $2,
                updated_at = NOW()
            WHERE id = $3
        `, [tier, endDate, tenantId]);

        return subscription;
    }

    /**
     * Cancel subscription at period end.
     */
    async cancelSubscription(tenantId, client = null) {
        const executor = client || db;
        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);

        if (!subscription) {
            throw new Error('No active subscription found to cancel.');
        }

        const result = await executor.query(`
            UPDATE subscriptions
            SET status = 'CANCELLED',
                cancel_at_period_end = TRUE,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [subscription.id]);

        return result.rows[0];
    }

    /**
     * Suspend tenant manually (Super Admin)
     */
    async suspendSubscription(tenantId, client = null) {
        const executor = client || db;
        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);

        if (!subscription) {
            throw new Error('No subscription found to suspend.');
        }

        const result = await executor.query(`
            UPDATE subscriptions
            SET status = 'SUSPENDED',
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [subscription.id]);

        return result.rows[0];
    }

    /**
     * Reactivate status (from CANCELLED or SUSPENDED)
     */
    async reactivateStatus(tenantId, client = null) {
        const executor = client || db;
        const subscription = await this.getSubscriptionByTenantId(tenantId, executor);

        if (!subscription) throw new Error('No subscription found.');

        const result = await executor.query(`
            UPDATE subscriptions
            SET status = 'ACTIVE',
                cancel_at_period_end = FALSE,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [subscription.id]);

        return result.rows[0];
    }

    async calculatePrice(tenantId, planId, billingCycle, quantity = 1, isNewSubscription = false, couponCode = null) {
        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];
        if (!plan) throw new Error('Plan not found.');

        const variationRes = await db.query(
            'SELECT * FROM plan_variations WHERE plan_id = $1 AND frequency = $2',
            [planId, billingCycle]
        );
        const variation = variationRes.rows[0];
        if (!variation) throw new Error(`Pricing not found for ${billingCycle} cycle.`);

        const unitPrice = parseFloat(variation.unit_price);
        const durationMonths = variation.duration_months;
        const gstPercent = parseFloat(variation.gst_percentage || 18);

        // Subscriptions are per-user based on the provided quantity or current employee count
        let currentCount = quantity;
        if (!currentCount || currentCount === 1) {
            const countRes = await db.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND is_deleted = false', [tenantId]);
            currentCount = Math.max(1, parseInt(countRes.rows[0].count, 10));
        }

        const baseSubscriptionAmount = unitPrice * currentCount * durationMonths;

        let setupFee = 0;
        if (isNewSubscription && plan.setup_fee) {
            setupFee = parseFloat(plan.setup_fee);
        }

        let taxableAmount = baseSubscriptionAmount + setupFee;
        let discountAmount = 0;

        // Apply Coupon
        if (couponCode) {
            try {
                const couponService = require('./coupon.service');
                const coupon = await couponService.validateCoupon(couponCode);
                // Calculate against base amount or total? Usually base.
                discountAmount = couponService.calculateDiscount(coupon, baseSubscriptionAmount);
                // Reducing base amount effectively
                // Or we can reduce total taxable amount?
                // Let's reduce taxableAmount for simplicity so GST is on discounted price
                taxableAmount = Math.max(0, taxableAmount - discountAmount);
            } catch (e) {
                console.warn('Coupon validation failed during calc:', e.message);
            }
        }

        const gstAmount = (taxableAmount * gstPercent) / 100;
        const totalAmount = taxableAmount + gstAmount;

        return {
            unit_price: unitPrice,
            quantity: currentCount,
            duration_months: durationMonths,
            base_subscription_amount: baseSubscriptionAmount,
            setup_fee: setupFee,
            discount_amount: discountAmount,
            gst_percentage: gstPercent,
            gst_amount: gstAmount,
            total_amount: Math.ceil(totalAmount),
            currency: 'INR'
        };
    }

    async initiateSubscription(tenantId, planId, billingCycle, quantity = null) {
        const existingSub = await this.getSubscriptionByTenantId(tenantId);
        const isNewSubscription = !existingSub || existingSub.is_trial;

        // Use stored coupon code if available
        const couponCode = existingSub?.coupon_code || null;

        const pricing = await this.calculatePrice(tenantId, planId, billingCycle, quantity, isNewSubscription, couponCode);

        // 1. Ensure a subscription record exists (even if pending)
        let subscription = existingSub;
        if (!subscription) {
            subscription = await this.createSubscription({
                tenant_id: tenantId,
                plan_id: planId,
                billing_cycle: billingCycle,
                is_trial: false,
                status: 'PAST_DUE', // Pending payment
                coupon_code: couponCode
            });
        }

        // 2. Create Invoice
        const durationMonths = pricing.duration_months;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const invoice = await invoiceService.createInvoice({
            tenant_id: tenantId,
            subscription_id: subscription.id,
            plan_id: planId,
            amount: pricing.total_amount,
            billing_period_start: startDate,
            billing_period_end: endDate,
            due_date: startDate
        });

        // 3. Get Payment Link
        const paymentData = await invoiceService.generatePaymentLink(invoice.id);

        // Increment coupon usage if used
        if (couponCode) {
            const couponService = require('./coupon.service');
            const coupon = await couponService.getCouponByCode(couponCode);
            if (coupon) await couponService.incrementUsage(coupon.id);
        }

        return {
            invoice_id: invoice.id,
            payment_session_id: paymentData.payment_session_id,
            order_id: paymentData.order_id,
            amount: pricing.total_amount,
            pricing_details: pricing
        };
    }

    async verifyPayment(tenantId, orderId) {
        try {
            const invoice = await invoiceService.getInvoiceByCashfreeId(orderId);
            if (!invoice) throw new Error('Invoice not found for this order.');

            const response = await cashfree.PGOrderFetchPayments("2023-08-01", orderId);
            const payments = response.data;
            const successfulPayment = payments.find(p => p.payment_status === 'SUCCESS');

            if (!successfulPayment) throw new Error('No successful payment found.');

            // Update Invoice
            await invoiceService.updateInvoiceStatus(invoice.id, 'PAID');

            // Update Subscription
            const subscription = await this.getSubscriptionByTenantId(tenantId);
            const durationMonths = 1; // Needs to be fetched from variation used in invoice
            // Actually, we should store duration in invoice.

            await db.query(`
                UPDATE subscriptions
                SET plan_id = $1,
                    status = 'ACTIVE',
                    is_trial = false,
                    last_payment_date = CURRENT_DATE,
                    end_date = $2,
                    amount_paid = amount_paid + $3,
                    updated_at = NOW()
                WHERE id = $4
            `, [invoice.plan_id, invoice.billing_period_end, invoice.amount, subscription.id]);

            // Sync to tenants table for fast lookup in middleware/frontend
            const planTierRes = await db.query('SELECT tier FROM plans WHERE id = $1', [invoice.plan_id]);
            const tier = planTierRes.rows[0]?.tier || 1;

            await db.query(`
                UPDATE tenants
                SET plan_type = $1,
                    plan_expiry_date = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, [tier, invoice.billing_period_end, tenantId]);

            // Create record in subscription_payments
            await db.query(`
                INSERT INTO subscription_payments (invoice_id, tenant_id, amount, status, payment_method, transaction_id, paid_at)
                VALUES ($1, $2, $3, 'SUCCESS', $4, $5, NOW())
            `, [invoice.id, tenantId, successfulPayment.payment_amount, successfulPayment.payment_group, successfulPayment.cf_payment_id]);

            return { success: true };
        } catch (error) {
            console.error('Payment Verification Error:', error.message);
            throw error;
        }
    }

    // Keep compatibility for now or refactor
    async getUsage(tenantId) {
        const sub = await this.getSubscriptionByTenantId(tenantId);
        const countRes = await db.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND is_deleted = false', [tenantId]);
        const currentCount = parseInt(countRes.rows[0].count, 10);

        return {
            plan_name: sub?.plan_name || 'NONE',
            max_employees: sub?.max_employees === null ? null : (sub?.max_employees ?? 0),
            current_employees: currentCount,
            status: sub?.status || 'INACTIVE',
            end_date: sub?.end_date
        };
    }

    async checkEmployeeLimit(tenantId) {
        const usage = await this.getUsage(tenantId);
        if (usage.max_employees === 0) return false;
        if (usage.max_employees === null) return true; // Unlimited
        return usage.current_employees < usage.max_employees;
    }

    async getOrders(tenantId) {
        const result = await db.query(`
            SELECT i.*, p.name as plan_name, sp.transaction_id, sp.payment_method, sp.paid_at
            FROM subscription_invoices i
            JOIN plans p ON i.plan_id = p.id
            LEFT JOIN subscription_payments sp ON i.id = sp.invoice_id
            WHERE i.tenant_id = $1
            ORDER BY i.created_at DESC
        `, [tenantId]);
        return result.rows;
    }
}

module.exports = new SubscriptionService();

