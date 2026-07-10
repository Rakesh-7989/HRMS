
const db = require('../../middleware/db');
const cashfree = require('../../config/cashfree');
const crypto = require('crypto');

class InvoiceService {
    async createInvoice(data, client = null) {
        const executor = client || db;
        const { tenant_id, subscription_id, plan_id, amount, billing_period_start, billing_period_end, due_date } = data;

        const invoiceNumber = `INV-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const result = await executor.query(`
            INSERT INTO subscription_invoices 
            (tenant_id, subscription_id, plan_id, invoice_number, amount, billing_period_start, billing_period_end, due_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
            RETURNING *
        `, [tenant_id, subscription_id, plan_id, invoiceNumber, amount, billing_period_start, billing_period_end, due_date]);

        return result.rows[0];
    }

    async getInvoiceById(id, client = null) {
        const executor = client || db;
        const result = await executor.query('SELECT * FROM subscription_invoices WHERE id = $1', [id]);
        return result.rows[0];
    }

    async getInvoiceByCashfreeId(cashfreeOrderId, client = null) {
        const executor = client || db;
        const result = await executor.query('SELECT * FROM subscription_invoices WHERE cashfree_order_id = $1', [cashfreeOrderId]);
        return result.rows[0];
    }

    async updateInvoiceStatus(id, status, cashfreeOrderId = null, paymentLink = null, client = null) {
        const executor = client || db;
        const result = await executor.query(`
            UPDATE subscription_invoices 
            SET status = $1, 
                cashfree_order_id = COALESCE($2, cashfree_order_id),
                payment_link = COALESCE($3, payment_link),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [status, cashfreeOrderId, paymentLink, id]);
        return result.rows[0];
    }

    async generatePaymentLink(invoiceId, client = null) {
        const executor = client || db;
        const invoice = await this.getInvoiceById(invoiceId, executor);
        if (!invoice) throw new Error('Invoice not found');

        // Fetch Tenant for customer info (since users only have emails initially)
        const tenantRes = await executor.query('SELECT name, email, phone FROM tenants WHERE id = $1', [invoice.tenant_id]);
        const tenant = tenantRes.rows[0];

        const request = {
            order_amount: parseFloat(invoice.amount),
            order_currency: 'INR',
            customer_details: {
                customer_id: invoice.tenant_id,
                customer_email: tenant?.email || 'customer@example.com',
                customer_phone: tenant?.phone || '9999999999',
                customer_name: tenant?.name || 'HR Admin'
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment-success?order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/subscriptions/webhook`
            },
            order_note: `Invoice ${invoice.invoice_number}`
        };

        try {
            const axios = require('axios');
            const isProd = process.env.CASHFREE_ENVIRONMENT === 'production';
            const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

            const response = await axios.post(`${baseUrl}/orders`, request, {
                headers: {
                    'x-client-id': process.env.CASHFREE_APP_ID,
                    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                    'x-api-version': '2023-08-01',
                    'Content-Type': 'application/json'
                }
            });

            const order = response.data;

            await this.updateInvoiceStatus(invoiceId, 'PENDING', order.order_id, order.payment_session_id, executor);

            return {
                payment_session_id: order.payment_session_id,
                order_id: order.order_id
            };
        } catch (error) {
            console.error('Cashfree Invoice Link Error:', error.response?.data || error.message);
            throw new Error('Error creating Cashfree payment link: ' + (error.response?.data?.message || error.message));
        }
    }

    async generateUpiQr(orderId) {
        try {
            const axios = require('axios');
            const isProd = process.env.CASHFREE_ENVIRONMENT === 'production';
            const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

            const response = await axios.post(`${baseUrl}/orders/${orderId}/pay`, {
                payment_method: {
                    upi: {
                        channel: "upi_qr"
                    }
                }
            }, {
                headers: {
                    'x-client-id': process.env.CASHFREE_APP_ID,
                    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                    'x-api-version': '2023-08-01',
                    'Content-Type': 'application/json'
                }
            });

            const payData = response.data;
            return {
                success: true,
                upi_qr_code: payData.upi_qr_code,
                order_id: orderId,
                status: payData.order_status || 'PENDING'
            };
        } catch (error) {
            console.error('Cashfree UPI QR Error:', error.response?.data || error.message);
            return {
                success: false,
                message: 'Failed to generate UPI QR code: ' + (error.response?.data?.message || error.message)
            };
        }
    }

    async verifyCashfreePayment(orderId) {
        try {
            const axios = require('axios');
            const isProd = process.env.CASHFREE_ENVIRONMENT === 'production';
            const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

            const response = await axios.get(`${baseUrl}/orders/${orderId}`, {
                headers: {
                    'x-client-id': process.env.CASHFREE_APP_ID,
                    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                    'x-api-version': '2023-08-01'
                }
            });

            const order = response.data;
            return {
                success: true,
                status: order.order_status, // "PAID", "ACTIVE", etc.
                data: order
            };
        } catch (error) {
            console.error('Cashfree Verification Error:', error.response?.data || error.message);
            return {
                success: false,
                message: 'Failed to verify payment with provider'
            };
        }
    }
}

module.exports = new InvoiceService();
