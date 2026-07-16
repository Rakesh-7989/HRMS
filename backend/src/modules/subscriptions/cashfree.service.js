const axios = require('axios');

class CashfreeService {
    constructor() {
        const isProd = process.env.CASHFREE_ENVIRONMENT === 'production';
        this.baseUrl = process.env.CASHFREE_BASE_URL || (isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

        this.headers = {
            'x-client-id': process.env.CASHFREE_APP_ID,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Create a Subscription (Plan) in Cashfree
     * Note: In Cashfree, "Subscription" often refers to the recurring plan definition
     * OR the actual user assignment depending on context. 
     * Here we treat it as Creating a 'Plan' if it doesn't exist.
     */
    async createPlan(planData) {
        // Implementation for creating a plan on Cashfree side if needed
        // Usually done once via dashboard, but can be done via API
        try {
            const response = await axios.post(`${this.baseUrl}/plans`, {
                plan_id: planData.plan_id,
                plan_name: planData.plan_name,
                plan_type: 'PERIODIC',
                plan_currency: 'INR',
                plan_amount: planData.amount,
                plan_max_amount: planData.amount,
                plan_interval_type: planData.interval_type, // DAY, WEEK, MONTH, YEAR
                plan_intervals: planData.intervals,
                plan_description: planData.description
            }, { headers: this.headers });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Cashfree Create Plan Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a Subscription for a Customer
     * This generates the auth link for the user to approve the mandate
     */
    async createSubscription(subscriptionData) {
        try {
            const {
                subscriptionId,
                planId,
                customerEmail,
                customerPhone,
                customerName,
                returnUrl,
                expiresOn
            } = subscriptionData;

            const payload = {
                subscription_id: subscriptionId,
                plan_id: planId,
                customer_details: {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone
                },
                subscription_expiry_time: expiresOn || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                subscription_meta: {
                    return_url: returnUrl,
                    notification_channel: ["EMAIL", "SMS"]
                }
            };

            const response = await axios.post(`${this.baseUrl}/subscriptions`, payload, { headers: this.headers });
            return response.data; // Contains auth_link
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Cashfree Create Subscription Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Verify Webhook Signature
     */
    verifySignature(signature, rawBody, timestamp) {
        try {
            // Use Cashfree SDK or manual crypto verification
            // Implementation: HMAC SHA256 of timestamp + rawBody using Secret Key
            const crypto = require('crypto');
            const data = timestamp + rawBody;
            const generatedSignature = crypto.createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
                .update(data)
                .digest('base64');

            return generatedSignature === signature;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Signature Verification Error:', error);
            return false;
        }
    }

    /**
     * Get Subscription Details
     */
    async getSubscription(subscriptionId) {
        try {
            const response = await axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, { headers: this.headers });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Get Subscription Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cancel Subscription at Cashfree (Stop Auto-debit)
     */
    async cancelSubscription(subscriptionId) {
        try {
            const response = await axios.patch(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {}, { headers: this.headers });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Cancel Subscription Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Charge a Subscription Immediately (Ad-hoc)
     * Used for proration charges or immediate seat additions
     */
    async chargeSubscription(subscriptionId, amount, description) {
        try {
            const payload = {
                amount: amount,
                currency: 'INR',
                description: description
            };
            const response = await axios.post(`${this.baseUrl}/subscriptions/${subscriptionId}/charge`, payload, { headers: this.headers });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Charge Subscription Error:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new CashfreeService();
