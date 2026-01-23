const db = require("../../../config/db");
const PDFDocument = require("pdfkit");

// ===================================================================
// PAYSLIP GENERATION
// ===================================================================

const getPayslipData = async (tenantId, payrollRunId, employeeId) => {
    const result = await db.query(
        `SELECT 
        pri.*,
        pr.period_month, pr.period_year, pr.period_start, pr.period_end, pr.pay_date, pr.run_number,
        e.first_name, e.last_name, e.employee_id as emp_code, e.email,
        esd.bank_name, esd.bank_account_number, esd.bank_ifsc,
        d.name as department_name, des.name as designation_name
     FROM payroll_run_items pri
     JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
     JOIN employees e ON e.id = pri.employee_id
     LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = TRUE
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations des ON des.id = e.designation_id
     WHERE pri.tenant_id = $1 AND pri.payroll_run_id = $2 AND pri.employee_id = $3`,
        [tenantId, payrollRunId, employeeId]
    );

    return result.rows[0];
};

const getEmployeePayslips = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT 
        pri.id, pri.net_salary, pri.gross_salary, pri.total_deductions,
        pr.period_month, pr.period_year, pr.pay_date, pr.status as payrun_status, pr.run_number
     FROM payroll_run_items pri
     JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
     WHERE pri.tenant_id = $1 AND pri.employee_id = $2 AND pr.status IN ('APPROVED', 'PAID')
     ORDER BY pr.period_year DESC, pr.period_month DESC`,
        [tenantId, employeeId]
    );

    return result.rows;
};

const generatePayslipPDF = async (tenantId, payrollRunId, employeeId) => {
    const data = await getPayslipData(tenantId, payrollRunId, employeeId);

    if (!data) {
        throw new Error('Payslip data not found');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('SALARY SLIP', { align: 'center' });
        doc.moveDown();

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        doc.fontSize(12).text(`For the month of ${monthNames[data.period_month - 1]} ${data.period_year}`, { align: 'center' });
        doc.moveDown(2);

        // Employee Details
        doc.fontSize(10);
        doc.text(`Employee Name: ${data.first_name} ${data.last_name}`);
        doc.text(`Employee ID: ${data.emp_code || 'N/A'}`);
        doc.text(`Department: ${data.department_name || 'N/A'}`);
        doc.text(`Designation: ${data.designation_name || 'N/A'}`);
        doc.moveDown();

        // Work Summary
        doc.text(`Working Days: ${data.total_working_days || 0}`);
        doc.text(`Present Days: ${data.present_days || 0}`);
        doc.text(`Leave Days: ${data.leave_days || 0}`);
        doc.text(`LOP Days: ${data.lop_days || 0}`);
        doc.moveDown();

        // Divider
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Earnings
        doc.fontSize(12).text('EARNINGS', { underline: true });
        doc.fontSize(10);
        doc.text(`Basic: ${formatCurrency(data.basic)}`);
        doc.text(`HRA: ${formatCurrency(data.hra)}`);
        doc.text(`DA: ${formatCurrency(data.da)}`);
        doc.text(`Special Allowance: ${formatCurrency(data.special_allowance)}`);
        doc.text(`Other Allowance: ${formatCurrency(data.other_allowance)}`);
        if (parseFloat(data.reimbursements) > 0) {
            doc.text(`Reimbursements: ${formatCurrency(data.reimbursements)}`);
        }
        doc.moveDown();
        doc.fontSize(11).text(`Total Earnings: ${formatCurrency(data.total_earnings)}`, { bold: true });
        doc.moveDown();

        // Deductions
        doc.fontSize(12).text('DEDUCTIONS', { underline: true });
        doc.fontSize(10);
        if (parseFloat(data.pf_employee) > 0) {
            doc.text(`PF (Employee): ${formatCurrency(data.pf_employee)}`);
        }
        if (parseFloat(data.esi_employee) > 0) {
            doc.text(`ESI (Employee): ${formatCurrency(data.esi_employee)}`);
        }
        if (parseFloat(data.professional_tax) > 0) {
            doc.text(`Professional Tax: ${formatCurrency(data.professional_tax)}`);
        }
        if (parseFloat(data.tds) > 0) {
            doc.text(`TDS: ${formatCurrency(data.tds)}`);
        }
        if (parseFloat(data.loan_deduction) > 0) {
            doc.text(`Loan Deduction: ${formatCurrency(data.loan_deduction)}`);
        }
        if (parseFloat(data.lop_deduction) > 0) {
            doc.text(`LOP Deduction: ${formatCurrency(data.lop_deduction)}`);
        }
        doc.moveDown();
        doc.fontSize(11).text(`Total Deductions: ${formatCurrency(data.total_deductions)}`, { bold: true });
        doc.moveDown();

        // Divider
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Net Salary
        doc.fontSize(14).text(`NET SALARY: ${formatCurrency(data.net_salary)}`, { bold: true });
        doc.moveDown(2);

        // Bank Details
        if (data.bank_account_number) {
            doc.fontSize(10);
            doc.text(`Bank: ${data.bank_name || 'N/A'}`);
            doc.text(`Account: ${maskAccountNumber(data.bank_account_number)}`);
            doc.text(`IFSC: ${data.bank_ifsc || 'N/A'}`);
        }

        doc.moveDown(2);

        // Footer
        doc.fontSize(8).text('This is a computer-generated payslip and does not require signature.', { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

        doc.end();
    });
};

const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const maskAccountNumber = (accNum) => {
    if (!accNum || accNum.length < 4) return accNum;
    return '****' + accNum.slice(-4);
};

// ===================================================================
// EMPLOYEE TAX DECLARATIONS
// ===================================================================

const getTaxDeclaration = async (tenantId, employeeId, financialYear) => {
    const result = await db.query(
        `SELECT * FROM employee_tax_declarations 
     WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3`,
        [tenantId, employeeId, financialYear]
    );
    return result.rows[0];
};

const upsertTaxDeclaration = async (tenantId, employeeId, payload) => {
    const { financialYear } = payload;
    const existing = await getTaxDeclaration(tenantId, employeeId, financialYear);

    const columnMap = {
        regime: 'regime',
        section80c: 'section_80c',
        section80ccc: 'section_80ccc',
        section80ccd1: 'section_80ccd_1',
        section80ccd1b: 'section_80ccd_1b',
        section80ccd2: 'section_80ccd_2',
        section80d: 'section_80d',
        section80dd: 'section_80dd',
        section80ddb: 'section_80ddb',
        section80e: 'section_80e',
        section80g: 'section_80g',
        section80gg: 'section_80gg',
        section80tta: 'section_80tta',
        section80u: 'section_80u',
        hraExemption: 'hra_exemption',
        rentPaidAnnually: 'rent_paid_annually',
        metroCity: 'metro_city',
        section24: 'section_24',
        section80ee: 'section_80ee',
        ltaClaimed: 'lta_claimed',
        otherExemptions: 'other_exemptions'
    };

    if (existing) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const key of Object.keys(payload)) {
            if (columnMap[key]) {
                fields.push(`${columnMap[key]} = $${idx++}`);
                values.push(payload[key]);
            }
        }

        if (fields.length === 0) return existing;

        // Calculate total
        let totalDeclared = 0;
        for (const key of Object.keys(columnMap)) {
            if (key !== 'regime' && key !== 'metroCity') {
                totalDeclared += parseFloat(payload[key] || existing[columnMap[key]] || 0);
            }
        }

        fields.push(`total_declared = $${idx++}`);
        values.push(totalDeclared);
        fields.push(`updated_at = now()`);
        values.push(existing.id);

        const result = await db.query(
            `UPDATE employee_tax_declarations SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
            values
        );

        return result.rows[0];
    } else {
        // Calculate total
        let totalDeclared = 0;
        for (const key of Object.keys(columnMap)) {
            if (key !== 'regime' && key !== 'metroCity') {
                totalDeclared += parseFloat(payload[key] || 0);
            }
        }

        const result = await db.query(
            `INSERT INTO employee_tax_declarations (
        tenant_id, employee_id, financial_year, regime,
        section_80c, section_80ccc, section_80ccd_1, section_80ccd_1b, section_80ccd_2,
        section_80d, section_80dd, section_80ddb, section_80e, section_80g, section_80gg,
        section_80tta, section_80u, hra_exemption, rent_paid_annually, metro_city,
        section_24, section_80ee, lta_claimed, other_exemptions, total_declared
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
            [
                tenantId, employeeId, financialYear, payload.regime || 'OLD',
                payload.section80c || 0, payload.section80ccc || 0, payload.section80ccd1 || 0,
                payload.section80ccd1b || 0, payload.section80ccd2 || 0,
                payload.section80d || 0, payload.section80dd || 0, payload.section80ddb || 0,
                payload.section80e || 0, payload.section80g || 0, payload.section80gg || 0,
                payload.section80tta || 0, payload.section80u || 0,
                payload.hraExemption || 0, payload.rentPaidAnnually || 0, payload.metroCity || false,
                payload.section24 || 0, payload.section80ee || 0, payload.ltaClaimed || 0,
                payload.otherExemptions || 0, totalDeclared
            ]
        );

        return result.rows[0];
    }
};

const submitTaxDeclaration = async (tenantId, declarationId) => {
    const result = await db.query(
        `UPDATE employee_tax_declarations 
     SET status = 'SUBMITTED', updated_at = now()
     WHERE tenant_id = $1 AND id = $2 AND status = 'DRAFT'
     RETURNING *`,
        [tenantId, declarationId]
    );

    if (result.rowCount === 0) {
        throw new Error('Declaration not found or already submitted');
    }

    return result.rows[0];
};

const verifyTaxDeclaration = async (tenantId, declarationId, userId) => {
    const result = await db.query(
        `UPDATE employee_tax_declarations 
     SET status = 'VERIFIED', verified_by = $1, verified_at = now(), updated_at = now()
     WHERE tenant_id = $2 AND id = $3 AND status = 'SUBMITTED'
     RETURNING *`,
        [userId, tenantId, declarationId]
    );

    if (result.rowCount === 0) {
        throw new Error('Declaration not found or not submitted');
    }

    return result.rows[0];
};

module.exports = {
    // Payslips
    getPayslipData,
    getEmployeePayslips,
    generatePayslipPDF,

    // Tax Declarations
    getTaxDeclaration,
    upsertTaxDeclaration,
    submitTaxDeclaration,
    verifyTaxDeclaration
};
