const db = require("../../config/db");
const invoiceService = require("./invoice.service");
const logger = require("../../config/logger");
const cashfree = require("../../config/cashfree");
const mailer = require("../../config/mailer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

class SubscriptionService {
    async getSubscriptionByTenantId(tenantId, client = null) {
        const executor = client || db;
        const res = await executor.query(
            `SELECT s.*, p.name as plan_name, p.features, p.max_employees
             FROM subscriptions s
             JOIN plans p ON s.plan_id = p.id
             WHERE s.tenant_id = $1 AND s.status != 'CANCELLED' 
             ORDER BY s.created_at DESC LIMIT 1`,
            [tenantId]
        );
        return res.rows[0];
    }

    async createSubscription(data, client = null) {
        const executor = client || db;
        const { tenant_id, plan_id, status, current_period_end, amount, billing_cycle, quantity, coupon_code } = data;
        const res = await executor.query(
            `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_end, amount, billing_cycle, quantity, coupon_code, is_trial)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
             RETURNING id, status`,
            [tenant_id, plan_id, status, current_period_end, amount, billing_cycle, quantity, coupon_code]
        );
        return res.rows[0];
    }

    async createPendingSubscription(tenantId, client, planId, billingCycle, couponCode = null) {
        const executor = client || db;
        const res = await executor.query(
            `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, coupon_code, is_trial)
             VALUES ($1, $2, 'PENDING_PAYMENT', $3, $4, false)
             RETURNING id`,
            [tenantId, planId, billingCycle, couponCode]
        );
        return res.rows[0];
    }

    async createTrial(tenantId, client, planId, billingCycle) {
        const executor = client || db;
        
        // If planId is missing, resolve it to 'STANDARD' to satisfy NOT NULL constraint
        let finalPlanId = planId;
        if (!finalPlanId) {
            const planRes = await executor.query("SELECT id FROM plans WHERE name = 'STANDARD' LIMIT 1");
            if (planRes.rowCount > 0) {
                finalPlanId = planRes.rows[0].id;
            }
        }

        const res = await executor.query(
            `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_end, billing_cycle, is_trial)
             VALUES ($1, $2, 'TRIAL', NOW() + INTERVAL '14 days', $3, true)
             RETURNING id`,
            [tenantId, finalPlanId, billingCycle]
        );

        // Update tenant trial state
        await executor.query(
            `UPDATE tenants SET is_active = true, updated_at = NOW() WHERE id = $1`,
            [tenantId]
        );
        return res.rows[0];
    }

    async calculatePrice(tenantId, planId, billingCycle, quantity = 1, isNewSubscription = false, couponCode = null, client = null) {
        const executor = client || db;
        
        console.log(`[DEBUG_PRICE] Calculating for Tenant: ${tenantId}, Plan: ${planId}, Cycle: ${billingCycle}, Input Quantity: ${quantity}`);

        const planRes = await executor.query('SELECT * FROM plans WHERE id = $1', [planId]);
        if (planRes.rowCount === 0) throw new Error('Selected plan not found.');
        const plan = planRes.rows[0];

        let durationMonths = 1;
        switch (billingCycle) {
            case 'QUARTERLY': durationMonths = 3; break;
            case 'HALF_YEARLY': durationMonths = 6; break;
            case 'YEARLY': durationMonths = 12; break;
            default: durationMonths = 1; break;
        }

        const priceRes = await executor.query(
            `SELECT unit_amount, interval FROM plan_prices 
             WHERE plan_id = $1 AND (interval = $2 OR interval = 'MONTHLY') AND is_active = true 
             ORDER BY interval = $2 DESC, created_at DESC LIMIT 1`,
            [planId, billingCycle]
        );

        let unitPrice = 0;
        if (priceRes.rowCount > 0) {
            unitPrice = parseFloat(priceRes.rows[0].unit_amount);
            // If the price returned is monthly but we need quarterly/yearly, multiply it
            if (priceRes.rows[0].interval === 'MONTHLY' && billingCycle !== 'MONTHLY') {
                unitPrice *= durationMonths;
            }
        } else {
            unitPrice = parseFloat(plan.current_price || plan.price || 0) * durationMonths;
        }

        // Subscriptions are per-user based on the provided quantity or current employee count
        let currentCount = parseInt(quantity, 10);
        if (!currentCount || currentCount <= 1) {
            const countRes = await executor.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND is_deleted = false', [tenantId]);
            currentCount = Math.max(1, parseInt(countRes.rows[0].count, 10));
        }

        const subtotal = Math.ceil(unitPrice * currentCount);

        let setupFee = 0;
        const paymentCheck = await executor.query("SELECT id FROM subscription_invoices WHERE tenant_id = $1 AND status = 'PAID' LIMIT 1", [tenantId]);
        const hasNeverPaid = paymentCheck.rowCount === 0;

        if (isNewSubscription || hasNeverPaid) {
            setupFee = parseFloat(plan.setup_fee || 0);
            console.log(`[DEBUG_PRICE] Applying Setup Fee: ${setupFee}`);
        }

        const baseTaxableAmount = subtotal + setupFee;
        let discountAmount = 0;
        if (couponCode) {
            try {
                // Synchronized with coupon.service.js schema: expires_at (not expiry_date)
                const couponRes = await executor.query(
                    "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expires_at > NOW() OR expires_at IS NULL)", 
                    [couponCode.toUpperCase()]
                );

                if (couponRes.rowCount > 0) {
                    const coupon = couponRes.rows[0];
                    // Apply discount to the WHOLE taxable total (Subtotal + Setup Fee) to match Frontend
                    if (coupon.discount_type === 'PERCENT') {
                        discountAmount = (baseTaxableAmount * parseFloat(coupon.discount_value)) / 100;
                    } else if (coupon.discount_type === 'FIXED') {
                        discountAmount = parseFloat(coupon.discount_value);
                    } else {
                        const type = coupon.discount_type || coupon.type;
                        const val = coupon.discount_value || coupon.value || 0;
                        if (type === 'PERCENTAGE' || type === 'PERCENT') {
                            discountAmount = (baseTaxableAmount * parseFloat(val)) / 100;
                        } else {
                            discountAmount = parseFloat(val);
                        }
                    }
                    console.log(`[DEBUG_PRICE] Coupon applied: ${couponCode}, Discount: ${discountAmount}`);
                } else {
                    console.warn(`[DEBUG_PRICE] Coupon ${couponCode} not found or inactive/expired`);
                }
            } catch (e) {
                console.warn('Coupon application failed:', e.message);
            }
        }

        const gstPercent = 18;
        const totalTaxable = Math.max(0, baseTaxableAmount - discountAmount);
        const gstAmount = Math.ceil(totalTaxable * (gstPercent / 100));
        const totalAmount = Math.ceil(totalTaxable + gstAmount);

        console.log(`[DEBUG_PRICE] FINAL CALC: (${unitPrice} * ${currentCount}) + ${setupFee} - ${discountAmount} + TAX = ${totalAmount}`);

        return {
            unit_price: unitPrice,
            quantity: currentCount,
            duration_months: durationMonths,
            base_subscription_amount: subtotal,
            setup_fee: setupFee,
            discount_amount: discountAmount,
            gst_percentage: gstPercent,
            gst_amount: gstAmount,
            total_amount: Math.ceil(totalAmount),
            currency: 'INR'
        };
    }

    async initiateSubscription(tenantId, planId, billingCycle, quantity = null, couponCode = null, client = null) {
        const executor = client || db;
        const existingSub = await this.getSubscriptionByTenantId(tenantId, executor);
        const isNewSubscription = !existingSub || existingSub.is_trial;

        // Ensure couponCode is respected from arguments if provided, otherwise fallback to existing sub
        const activeCoupon = couponCode || existingSub?.coupon_code || null;
        const pricing = await this.calculatePrice(tenantId, planId, billingCycle, quantity, isNewSubscription, activeCoupon, executor);

        let subscription = existingSub;
        if (!subscription) {
            subscription = await this.createSubscription({
                tenant_id: tenantId,
                plan_id: planId,
                billing_cycle: billingCycle,
                status: 'PAST_DUE',
                quantity: pricing.quantity,
                amount: pricing.total_amount,
                coupon_code: activeCoupon
            }, executor);
        }

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
        }, executor);

        // If amount is 0 (due to 100% coupon or trial upgrade), don't call Cashfree
        if (pricing.total_amount <= 0) {
            console.log(`[DEBUG_PRICE] Amount is 0 for Invoice ${invoice.id}. Bypassing Cashfree.`);
            await invoiceService.updateInvoiceStatus(invoice.id, 'PAID', `FREE-${invoice.id}`, 'N/A', executor);
            
            if (activeCoupon) {
                const couponService = require('./coupon.service');
                const coupon = await couponService.getCouponByCode(activeCoupon, executor);
                if (coupon) await couponService.incrementUsage(coupon.id, executor);
            }

            return {
                invoice_id: invoice.id,
                payment_session_id: null,
                order_id: `FREE-${invoice.id}`,
                amount: 0,
                pricing_details: pricing,
                skip_checkout: true
            };
        }

        const paymentData = await invoiceService.generatePaymentLink(invoice.id, executor);

        if (activeCoupon) {
            const couponService = require('./coupon.service');
            const coupon = await couponService.getCouponByCode(activeCoupon, executor);
            if (coupon) await couponService.incrementUsage(coupon.id, executor);
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
            console.log(`[DEBUG_VERIFY] Starting verification for Order: ${orderId}, Tenant: ${tenantId}`);
            
            let result;
            let successfulPayment = null;

            if (orderId && orderId.startsWith('FREE-')) {
                console.log(`[DEBUG_VERIFY] Virtual verification for FREE order: ${orderId}`);
                result = { success: true, status: 'PAID', data: { is_free: true } };
                // Mock a successful payment object
                successfulPayment = { payment_status: 'SUCCESS', payment_amount: 0, payment_group: 'FREE', cf_payment_id: orderId };
            } else {
                result = await invoiceService.verifyCashfreePayment(orderId);
            }
            
            console.log(`[DEBUG_VERIFY] Verification Response:`, JSON.stringify(result, null, 2));

            const isSuccessStatus = ['PAID', 'SUCCESS', 'ACTIVE', 'COMPLETED'].includes(String(result.status || '').toUpperCase());

            if (result.success && isSuccessStatus) {
                const resolvedTenantId = tenantId || result.data?.customer_details?.customer_id;
                
                if (!resolvedTenantId) {
                    throw new Error('Tenant identification failed during verification');
                }

                const invoice = await invoiceService.getInvoiceByCashfreeId(orderId);
                if (!invoice) throw new Error('Invoice not found for this order.');

                // Only call Cashfree /payments if it's NOT a free order
                if (!successfulPayment) {
                    const axios = require('axios');
                    const isProd = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION';
                    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

                    const response = await axios.get(`${baseUrl}/orders/${orderId}/payments`, {
                        headers: {
                            'x-client-id': process.env.CASHFREE_APP_ID,
                            'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                            'x-api-version': '2023-08-01'
                        }
                    });
                    
                    const payments = response.data;
                    successfulPayment = payments.find(p => p.payment_status === 'SUCCESS');
                }

                if (!successfulPayment) throw new Error('No successful payment found.');

                const client = await db.connect();
                try {
                    await client.query('BEGIN');

                    // 1. Update Invoice
                    console.log(`[DEBUG_VERIFY] Updating Invoice ${invoice.id} to PAID`);
                    await invoiceService.updateInvoiceStatus(invoice.id, 'PAID', orderId, null, client);

                    // 2. Update Subscription
                    const subscription = await this.getSubscriptionByTenantId(resolvedTenantId, client);
                    if (subscription) {
                        console.log(`[DEBUG_VERIFY] Updating Subscription ${subscription.id} to ACTIVE`);
                        await client.query(`
                            UPDATE subscriptions
                            SET status = 'ACTIVE',
                                is_trial = false,
                                last_payment_date = NOW(),
                                current_period_start = NOW(),
                                current_period_end = $1,
                                amount_paid = amount_paid + $2,
                                updated_at = NOW()
                            WHERE id = $3
                        `, [invoice.billing_period_end, invoice.amount, subscription.id]);
                    }

                    // 3. Activate Tenant
                    const planRes = await client.query('SELECT tier FROM plans WHERE id = $1', [invoice.plan_id]);
                    const plan = planRes.rows[0];
                    const tier = plan?.tier || 1;

                    console.log(`[DEBUG_VERIFY] Activating Tenant ${resolvedTenantId} with Plan Tier ${tier}`);
                    await client.query(`
                        UPDATE tenants
                        SET plan_type = $1,
                            plan_expiry_date = $2,
                            is_active = true,
                            registration_status = 'COMPLETED',
                            updated_at = NOW()
                        WHERE id = $3
                    `, [tier, invoice.billing_period_end, resolvedTenantId]);

                    // 4. Handle User Activation & Welcome Email
                    // Find the ADMIN user. If they were inactive (first time registration), we send welcome email.
                    const userRes = await client.query(`
                        SELECT id, email, is_active, tenant_id FROM users 
                        WHERE tenant_id = $1 AND role = 'ADMIN' LIMIT 1
                    `, [resolvedTenantId]);
                    
                    if (userRes.rowCount > 0) {
                        const adminUser = userRes.rows[0];
                        const wasInactive = !adminUser.is_active;

                        // ONLY generate and set password if the user was inactive (new registration)
                        // This prevents race conditions where double verification (webhook + redirect) 
                        // overwrites the password sent in the email.
                        if (wasInactive) {
                            const tempPassword = crypto.randomBytes(6).toString("hex");
                            const passwordHash = await bcrypt.hash(tempPassword, 10);

                            console.log(`[DEBUG_VERIFY] Initial activation for User ${adminUser.id} (${adminUser.email}). Setting temp password.`);
                            await client.query(`
                                UPDATE users
                                SET is_active = true,
                                    password_hash = $1,
                                    must_change_password = true,
                                    updated_at = NOW()
                                WHERE id = $2
                            `, [passwordHash, adminUser.id]);

                            // Find tenant name for email context
                            const tRes = await client.query('SELECT name FROM tenants WHERE id = $1', [resolvedTenantId]);
                            const tenantName = tRes.rows[0]?.name || 'Your Organization';

                            console.log(`[DEBUG_VERIFY] Triggering Welcome Email to ${adminUser.email}`);
                            try {
                                await mailer.sendWelcomeEmail(adminUser.email, tenantName, tempPassword);
                            } catch (emailErr) {
                                console.error('[DEBUG_VERIFY] Email dispatch failed:', emailErr.message);
                            }
                        } else {
                            console.log(`[DEBUG_VERIFY] User ${adminUser.id} already active. Skipping password reset.`);
                        }
                    }

                    // 5. Create record in subscription_payments
                    await client.query(`
                        INSERT INTO subscription_payments (invoice_id, tenant_id, amount, status, payment_method, transaction_id, paid_at)
                        VALUES ($1, $2, $3, 'SUCCESS', 'CASHFREE', $4, NOW())
                    `, [invoice.id, resolvedTenantId, invoice.amount, orderId]);

                    await client.query('COMMIT');
                    return { success: true };
                } catch (txError) {
                    await client.query('ROLLBACK');
                    throw txError;
                } finally {
                    client.release();
                }
            } else {
                return { success: false, status: result.status };
            }
        } catch (error) {
            console.error('Payment Verification Error:', error.message);
            throw error;
        }
    }

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
        if (usage.max_employees === null) return true; 
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
