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

    async getInvoiceById(id) {
        const result = await db.query('SELECT * FROM subscription_invoices WHERE id = $1', [id]);
        return result.rows[0];
    }

    async getInvoiceByCashfreeId(cashfreeOrderId) {
        const result = await db.query('SELECT * FROM subscription_invoices WHERE cashfree_order_id = $1', [cashfreeOrderId]);
        return result.rows[0];
    }

    async updateInvoiceStatus(id, status, cashfreeOrderId = null, paymentLink = null) {
        const result = await db.query(`
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

    async generatePaymentLink(invoiceId) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) throw new Error('Invoice not found');

        // Fetch User for customer info
        const userRes = await db.query('SELECT email, first_name, last_name, phone FROM users WHERE tenant_id = $1 AND role = \'ADMIN\' LIMIT 1', [invoice.tenant_id]);
        const adminUser = userRes.rows[0];

        const request = {
            order_amount: parseFloat(invoice.amount),
            order_currency: 'INR',
            customer_details: {
                customer_id: invoice.tenant_id,
                customer_email: adminUser?.email || 'customer@example.com',
                customer_phone: adminUser?.phone || '9999999999',
                customer_name: `${adminUser?.first_name || ''} ${adminUser?.last_name || ''}`.trim() || 'HR Admin'
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment-success?order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/subscriptions/webhook`
            },
            order_note: `Invoice ${invoice.invoice_number}`
        };

        try {
            const response = await cashfree.PGCreateOrder("2023-08-01", request);
            const order = response.data;

            await this.updateInvoiceStatus(invoiceId, 'PENDING', order.order_id, order.payment_session_id); // we store payment_session_id as payment_link for now or use the actual link if provided

            return {
                payment_session_id: order.payment_session_id,
                order_id: order.order_id
            };
        } catch (error) {
            console.error('Cashfree Invoice Link Error:', error.response?.data || error.message);
            throw new Error('Error creating Cashfree payment link');
        }
    }
}

module.exports = new InvoiceService();
