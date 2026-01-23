const db = require("../../../config/db");

// ===================================================================
// CONSULTANTS
// ===================================================================

const createConsultant = async (tenantId, userId, payload) => {
    const {
        name, email, phone, pan, gstNumber, companyName,
        bankName, bankAccountNumber, bankIfsc,
        contractStart, contractEnd, monthlyRate, hourlyRate, tdsRate
    } = payload;

    // Validate required fields
    if (!name || name.trim().length < 2) {
        throw new Error('Consultant name is required (min 2 characters)');
    }

    // Validate TDS rate (0-100%)
    const validTdsRate = tdsRate !== undefined ? tdsRate : 10;
    if (validTdsRate < 0 || validTdsRate > 100) {
        throw new Error('TDS rate must be between 0 and 100%');
    }

    // Validate rates are positive if provided
    if (monthlyRate !== undefined && monthlyRate < 0) {
        throw new Error('Monthly rate cannot be negative');
    }
    if (hourlyRate !== undefined && hourlyRate < 0) {
        throw new Error('Hourly rate cannot be negative');
    }

    const result = await db.query(
        `INSERT INTO consultants (
      tenant_id, name, email, phone, pan, gst_number, company_name,
      bank_name, bank_account_number, bank_ifsc,
      contract_start, contract_end, monthly_rate, hourly_rate, tds_rate,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
        [
            tenantId, name.trim(), email || null, phone || null, pan || null, gstNumber || null, companyName || null,
            bankName || null, bankAccountNumber || null, bankIfsc || null,
            contractStart || null, contractEnd || null, monthlyRate || null, hourlyRate || null, validTdsRate,
            userId
        ]
    );

    return result.rows[0];
};

const getConsultants = async (tenantId, activeOnly = true) => {
    let query = `SELECT * FROM consultants WHERE tenant_id = $1`;
    if (activeOnly) {
        query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, [tenantId]);
    return result.rows;
};

const getConsultantById = async (tenantId, consultantId) => {
    const result = await db.query(
        `SELECT * FROM consultants WHERE tenant_id = $1 AND id = $2`,
        [tenantId, consultantId]
    );
    return result.rows[0];
};

const updateConsultant = async (tenantId, consultantId, payload) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMap = {
        name: 'name',
        email: 'email',
        phone: 'phone',
        pan: 'pan',
        gstNumber: 'gst_number',
        companyName: 'company_name',
        bankName: 'bank_name',
        bankAccountNumber: 'bank_account_number',
        bankIfsc: 'bank_ifsc',
        contractStart: 'contract_start',
        contractEnd: 'contract_end',
        monthlyRate: 'monthly_rate',
        hourlyRate: 'hourly_rate',
        tdsRate: 'tds_rate',
        isActive: 'is_active'
    };

    for (const key of Object.keys(payload)) {
        if (columnMap[key]) {
            fields.push(`${columnMap[key]} = $${idx++}`);
            values.push(payload[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(tenantId, consultantId);

    const result = await db.query(
        `UPDATE consultants SET ${fields.join(', ')}
     WHERE tenant_id = $${idx++} AND id = $${idx}
     RETURNING *`,
        values
    );

    return result.rows[0];
};

// ===================================================================
// CONSULTANT INVOICES
// ===================================================================

const createInvoice = async (tenantId, payload) => {
    const { consultantId, invoiceNumber, invoiceDate, amount, gstAmount, description } = payload;

    // Get consultant TDS rate
    const consultant = await getConsultantById(tenantId, consultantId);
    if (!consultant) {
        throw new Error('Consultant not found');
    }

    const tdsRate = consultant.tds_rate || 10;
    const tdsAmount = (amount * tdsRate) / 100;
    const netPayable = amount + (gstAmount || 0) - tdsAmount;

    const result = await db.query(
        `INSERT INTO consultant_invoices (
      tenant_id, consultant_id, invoice_number, invoice_date,
      amount, gst_amount, tds_amount, net_payable, description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
        [
            tenantId, consultantId, invoiceNumber, invoiceDate,
            amount, gstAmount || 0, tdsAmount, netPayable, description || null
        ]
    );

    return result.rows[0];
};

const getInvoices = async (tenantId, filters = {}) => {
    let query = `
    SELECT ci.*, c.name as consultant_name, c.company_name
    FROM consultant_invoices ci
    JOIN consultants c ON c.id = ci.consultant_id
    WHERE ci.tenant_id = $1
  `;
    const params = [tenantId];
    let idx = 2;

    if (filters.consultantId) {
        query += ` AND ci.consultant_id = $${idx++}`;
        params.push(filters.consultantId);
    }

    if (filters.status) {
        query += ` AND ci.status = $${idx++}`;
        params.push(filters.status);
    }

    query += ` ORDER BY ci.invoice_date DESC`;

    const result = await db.query(query, params);
    return result.rows;
};

const approveInvoice = async (tenantId, invoiceId) => {
    const result = await db.query(
        `UPDATE consultant_invoices 
     SET status = 'APPROVED'
     WHERE tenant_id = $1 AND id = $2 AND status = 'PENDING'
     RETURNING *`,
        [tenantId, invoiceId]
    );

    if (result.rowCount === 0) {
        throw new Error('Invoice not found or already processed');
    }

    return result.rows[0];
};

const markInvoicePaid = async (tenantId, invoiceId, paymentReference) => {
    const result = await db.query(
        `UPDATE consultant_invoices 
     SET status = 'PAID', paid_at = now(), payment_reference = $1
     WHERE tenant_id = $2 AND id = $3 AND status = 'APPROVED'
     RETURNING *`,
        [paymentReference || null, tenantId, invoiceId]
    );

    if (result.rowCount === 0) {
        throw new Error('Invoice not found or not approved');
    }

    return result.rows[0];
};

// ===================================================================
// CONSULTANT PAYROLL SUMMARY
// ===================================================================

const getConsultantPayrollSummary = async (tenantId, filters = {}) => {
    let whereClause = `WHERE ci.tenant_id = $1`;
    const params = [tenantId];
    let idx = 2;

    if (filters.fromDate) {
        whereClause += ` AND ci.invoice_date >= $${idx++}`;
        params.push(filters.fromDate);
    }

    if (filters.toDate) {
        whereClause += ` AND ci.invoice_date <= $${idx++}`;
        params.push(filters.toDate);
    }

    const result = await db.query(
        `SELECT 
       c.id as consultant_id,
       c.name as consultant_name,
       c.company_name,
       COUNT(ci.id) as total_invoices,
       SUM(ci.amount) as total_amount,
       SUM(ci.gst_amount) as total_gst,
       SUM(ci.tds_amount) as total_tds,
       SUM(ci.net_payable) as total_net_payable,
       SUM(CASE WHEN ci.status = 'PAID' THEN ci.net_payable ELSE 0 END) as total_paid,
       SUM(CASE WHEN ci.status != 'PAID' THEN ci.net_payable ELSE 0 END) as total_pending
     FROM consultants c
     LEFT JOIN consultant_invoices ci ON ci.consultant_id = c.id
     ${whereClause}
     GROUP BY c.id, c.name, c.company_name
     ORDER BY total_amount DESC`,
        params
    );

    return result.rows;
};

module.exports = {
    // Consultants
    createConsultant,
    getConsultants,
    getConsultantById,
    updateConsultant,

    // Invoices
    createInvoice,
    getInvoices,
    approveInvoice,
    markInvoicePaid,

    // Summary
    getConsultantPayrollSummary
};
