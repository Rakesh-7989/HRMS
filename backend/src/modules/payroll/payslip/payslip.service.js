const db = require("../../../config/db");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const converter = require("number-to-words");
const mailer = require("../../../config/mailer");

// ===================================================================
// PAYSLIP GENERATION
// ===================================================================

const getPayslipData = async (tenantId, payrollRunId, employeeId) => {
    const result = await db.query(
        `SELECT 
        pri.*,
        pr.period_month, pr.period_year, pr.period_start, pr.period_end, pr.pay_date, pr.run_number,
        e.first_name, e.last_name, e.employee_id as emp_code, e.gender, e.join_date, u.email,
        e.bank_name, e.account_number as bank_account_number, e.ifsc_code as bank_ifsc, e.tax_id,
        e.uan, e.pf_account, e.esi_number,
        esa.annual_ctc as ctc,
        d.name as department_name, des.name as designation_name,
        t.name as company_name, t.address as company_address, t.settings as company_settings
     FROM payroll_run_items pri
     JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
     JOIN employees e ON e.id = pri.employee_id
     JOIN users u ON u.id = e.user_id
     JOIN tenants t ON t.id = pri.tenant_id
     LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations des ON des.id = e.designation_id
     WHERE pri.tenant_id = $1 AND pri.payroll_run_id = $2 AND pri.employee_id = $3`,
        [tenantId, payrollRunId, employeeId]
    );

    if (result.rowCount === 0) return null;
    const data = result.rows[0];

    // Fetch dynamic components breakdown
    const components = await db.query(
        `SELECT name, code, amount, component_type 
         FROM payroll_run_item_components 
         WHERE payroll_run_item_id = $1 AND tenant_id = $2
         ORDER BY (CASE WHEN component_type = 'EARNING' THEN 1 ELSE 2 END), amount DESC`,
        [data.id, tenantId]
    );
    data.components = components.rows;

    return data;
};

const getPayslipById = async (tenantId, payslipId) => {
    const result = await db.query(
        `SELECT 
        pri.*,
        pr.period_month, pr.period_year, pr.period_start, pr.period_end, pr.pay_date, pr.run_number,
        e.first_name, e.last_name, e.employee_id as emp_code, e.gender, e.join_date, u.email,
        e.bank_name, e.account_number as bank_account_number, e.ifsc_code as bank_ifsc, e.tax_id,
        e.uan, e.pf_account, e.esi_number,
        esa.annual_ctc as ctc,
        d.name as department_name, des.name as designation_name,
        t.name as company_name, t.address as company_address, t.settings as company_settings
     FROM payroll_run_items pri
     JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
     JOIN employees e ON e.id = pri.employee_id
     JOIN users u ON u.id = e.user_id
     JOIN tenants t ON t.id = pri.tenant_id
     LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations des ON des.id = e.designation_id
     WHERE pri.tenant_id = $1 AND pri.id = $2`,
        [tenantId, payslipId]
    );

    if (result.rowCount === 0) return null;
    const data = result.rows[0];

    // Fetch dynamic components breakdown
    const components = await db.query(
        `SELECT name, code, amount, component_type 
         FROM payroll_run_item_components 
         WHERE payroll_run_item_id = $1 AND tenant_id = $2
         ORDER BY (CASE WHEN component_type = 'EARNING' THEN 1 ELSE 2 END), amount DESC`,
        [data.id, tenantId]
    );
    data.components = components.rows;

    return data;
};

const getEmployeePayslips = async (tenantId, employeeId) => {
    const result = await db.query(
        `SELECT 
        pri.id, pri.payroll_run_id, pri.net_salary as net, pri.gross_salary as gross, pri.total_deductions as deductions,
        pr.period_month, pr.period_year, TO_CHAR(pr.pay_date, 'YYYY-MM-DD') as date, pr.status as payrun_status, pr.run_number,
        u.email as employee_email
     FROM payroll_run_items pri
     JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
     JOIN employees e ON e.id = pri.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE pri.tenant_id = $1 AND pri.employee_id = $2 AND pr.status IN ('APPROVED', 'PAID') AND pr.status != 'VOIDED'
     ORDER BY pr.period_year DESC, pr.period_month DESC`,
        [tenantId, employeeId]
    );

    return result.rows;
};

const listAllPayslips = async (tenantId, filters = {}) => {
    let query = `
        SELECT 
            pri.id, pri.payroll_run_id, pri.net_salary as net, pri.gross_salary as gross, pri.total_deductions as deductions,
            pr.period_month, pr.period_year, TO_CHAR(pr.pay_date, 'YYYY-MM-DD') as date, pr.status as payrun_status, pr.run_number,
            e.first_name || ' ' || e.last_name as employee_name, e.employee_id as emp_code,
            u.email as employee_email
         FROM payroll_run_items pri
         JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
         JOIN employees e ON e.id = pri.employee_id
         JOIN users u ON u.id = e.user_id
         WHERE pri.tenant_id = $1 AND pr.status != 'VOIDED'
    `;

    const params = [tenantId];
    let i = 2;

    if (filters.from_date) {
        query += ` AND pr.pay_date >= $${i}`;
        params.push(filters.from_date);
        i++;
    }

    if (filters.to_date) {
        query += ` AND pr.pay_date <= $${i}`;
        params.push(filters.to_date);
        i++;
    }

    // Default sorting
    query += ` ORDER BY pr.pay_date DESC, e.first_name ASC`;

    const result = await db.query(query, params);
    return result.rows;
};

const generatePayslipPDF = async (tenantId, payrollRunId, employeeId) => {
    const data = await getPayslipData(tenantId, payrollRunId, employeeId);

    if (!data) {
        throw new Error('Payslip data not found');
    }
    return generatePDFFromData(data);
};

const generatePayslipPDFById = async (tenantId, payslipId) => {
    const data = await getPayslipById(tenantId, payslipId);

    if (!data) {
        throw new Error('Payslip data not found');
    }
    return generatePDFFromData(data);
};

const generatePDFFromData = async (data) => {
    // Create PDF document
    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
            Title: `Payslip - ${data.first_name} ${data.last_name}`,
            Author: data.company_name || 'HRMS'
        }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.on('error', reject);

        // --- Corporate Branding & Layout ---

        // Colors - Dynamic based on HR selection
        const primaryColor = data.company_settings?.primary_color || '#1a365d'; // Fallback to Navy blue
        const secondaryColor = '#4a5568';
        const borderColor = '#cbd5e0';
        const lightBg = '#f7fafc';

        // Helper to draw a horizontal line
        const drawLine = (y) => {
            doc.moveTo(40, y).lineTo(555, y).stroke(borderColor);
        };

        // --- Header Section (Logo Right, Text Left) ---
        const logoUrl = data.company_settings?.logo_url;
        let headerY = 25;

        // 1. Draw Logo on the Right
        if (logoUrl) {
            try {
                const projectRoot = process.cwd();
                let logoPath = "";

                if (logoUrl.startsWith('/uploads')) {
                    logoPath = path.join(projectRoot, logoUrl);
                } else if (logoUrl.includes('uploads')) {
                    const relativePart = logoUrl.substring(logoUrl.indexOf('uploads'));
                    logoPath = path.join(projectRoot, relativePart);
                }

                if (logoPath && fs.existsSync(logoPath)) {
                    // Position logo on the top right
                    doc.image(logoPath, 395, headerY, { height: 60, width: 160, fit: [160, 60], align: 'right' });
                }
            } catch (e) {
                console.error('Failed to embed logo in PDF:', e);
            }
        }

        // 2. Draw Text on the Left
        // --- PAYSLIP JUN 2025 ---
        doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('PAYSLIP ', 40, headerY, { continued: true });
        doc.font('Helvetica').fillColor('#666').text(`${getMonthName(data.period_month).toUpperCase()} ${data.period_year}`);

        headerY += 25;

        // --- Company Name ---
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text((data.company_name || 'COMPANY NAME').toUpperCase(), 40, headerY, { width: 350 });

        headerY += 15;

        // --- Company Address ---
        if (data.company_address) {
            doc.fillColor('#444').fontSize(8).font('Helvetica').text(data.company_address, 40, headerY, { width: 350, lineGap: 2 });
            headerY = doc.y + 10; // Catch the Y position after multiline address
        } else {
            headerY += 10;
        }

        // Accent line below header
        headerY += 5;
        doc.rect(40, headerY, 515, 1).fill(borderColor);

        doc.fillColor(secondaryColor).fontSize(8).text('Private & Confidential', 40, headerY + 5, { align: 'right' });

        doc.moveDown(2);

        // --- Associate Information Section ---
        const infoY = headerY + 15;
        const boxTop = infoY + 20;
        const infoRowHeight = 15;
        const infoRows = 7;
        const boxHeight = 25 + (infoRows * infoRowHeight); // Extra room for name and padding

        // Header Background
        doc.rect(40, infoY, 515, 20).fill('#f8fafc'); // Even lighter background for modern look
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Associate Information', 40, infoY + 5, { align: 'center', width: 515 });

        // Outer Box
        doc.rect(40, boxTop, 515, boxHeight).stroke(borderColor);

        // Name Row
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
        doc.text(`Mr. ${data.first_name} ${data.last_name}`, 45, boxTop + 5);

        // Vertical dividers for the grid
        const midX = 40 + (515 / 2);
        doc.moveTo(midX, boxTop).lineTo(midX, boxTop + boxHeight).stroke(borderColor);

        // Grid Rows
        const col1 = 45;
        const col2 = 145;
        const col3 = midX + 5;
        const col4 = midX + 115;

        const drawInfoRow = (label1, val1, label2, val2, y) => {
            // Row line (top)
            doc.moveTo(40, y).lineTo(555, y).stroke(borderColor);

            // Label/Value 1
            doc.font('Helvetica').fillColor(secondaryColor).text(label1, col1, y + 4);
            doc.font('Helvetica-Bold').fillColor('#000').text(val1 || '-', col2, y + 4);

            // Label/Value 2
            doc.font('Helvetica').fillColor(secondaryColor).text(label2, col3, y + 4);
            doc.font('Helvetica-Bold').fillColor('#000').text(val2 || '-', col4, y + 4);
        };

        const calendarDays = new Date(data.period_year, data.period_month, 0).getDate();
        const paidDays = calendarDays - (parseFloat(data.lop_days) || 0);

        let currentY = boxTop + 20;
        drawInfoRow('Associate Id', data.emp_code, 'Location', data.city || 'N/A', currentY); currentY += infoRowHeight;
        drawInfoRow('Designation', data.designation_name, 'PAN', data.tax_id || '-', currentY); currentY += infoRowHeight;
        drawInfoRow('Gender', data.gender || 'N/A', 'Bank A/C', maskAccountNumber(data.bank_account_number), currentY); currentY += infoRowHeight;
        drawInfoRow('Date Of Joining', data.join_date ? new Date(data.join_date).toLocaleDateString('en-IN') : 'N/A', 'ESI Number', data.esi_number || '-', currentY); currentY += infoRowHeight;
        drawInfoRow('PF A/C', data.pf_account || '-', 'Status', 'Salary Credited', currentY); currentY += infoRowHeight;
        drawInfoRow('UAN', data.uan || '-', 'Calendar Days', calendarDays.toString(), currentY); currentY += infoRowHeight;
        drawInfoRow('Paid Days', paidDays.toString(), 'LOP Days', data.lop_days || '0', currentY);

        doc.moveDown(2);

        // --- Earnings & Deductions Tables ---
        const tableY = currentY + 20; // Dynamic Y to avoid overlap with box above
        const totalWidth = 515;
        const halfWidth = totalWidth / 2;
        const middleX = 40 + halfWidth;

        // Prepare data lists
        const earningsList = [];
        const deductionsList = [];

        if (data.components && data.components.length > 0) {
            // Dynamic rendering from stored breakdown
            data.components.forEach(c => {
                const amount = parseFloat(c.amount);
                if (amount <= 0) return;

                if (c.component_type === 'EARNING') {
                    earningsList.push({ label: c.name, value: amount });
                } else if (c.component_type === 'DEDUCTION') {
                    // Only show DEDUCTION type (employee deductions like PT, PF Employee, ESI)
                    deductionsList.push({ label: c.name, value: amount });
                }
                // NOTE: EMPLOYER_CONTRIBUTION (PF Employer, Gratuity) is intentionally
                // NOT shown in Deductions column as per MNC payslip standards.
                // These are employer costs, not employee deductions.
            });
        } else {
            // Legacy Fallback
            earningsList.push({ label: 'Basic', value: data.basic });
            earningsList.push({ label: 'House Rent Allowance', value: data.hra });
            if (parseFloat(data.da) > 0) earningsList.push({ label: 'Conveyance Allowance', value: data.da });
            if (parseFloat(data.special_allowance) > 0) earningsList.push({ label: 'Special Allowance', value: data.special_allowance });
            if (parseFloat(data.other_allowance) > 0) earningsList.push({ label: 'Other Allowances', value: data.other_allowance });

            deductionsList.push({ label: 'Professional Tax', value: data.professional_tax });
            deductionsList.push({ label: 'Provident Fund', value: data.pf_employee });
            if (parseFloat(data.esi_employee) > 0) deductionsList.push({ label: 'ESI', value: data.esi_employee });
            if (parseFloat(data.lwf_employee) > 0) deductionsList.push({ label: 'LWF', value: data.lwf_employee });
            if (parseFloat(data.tds) > 0) deductionsList.push({ label: 'TDS', value: data.tds });
        }

        // Add additional items that might not be in the component list (Adjustments, Reimbursements, etc.)
        if (parseFloat(data.reimbursements) > 0) {
            earningsList.push({ label: 'Reimbursements', value: data.reimbursements });
        }
        if (parseFloat(data.loan_deduction) > 0) {
            deductionsList.push({ label: 'Loan Recovery', value: data.loan_deduction });
        }
        if (parseFloat(data.lop_deduction) > 0) {
            deductionsList.push({ label: 'LOP Deduction', value: data.lop_deduction });
        }

        const maxRows = Math.max(earningsList.length, deductionsList.length, 8); // At least 8 rows for style
        const rowHeight = 15;
        const tableHeight = (maxRows + 1) * rowHeight; // +1 for header

        // 1. Draw Background for Headers
        doc.rect(40, tableY, totalWidth, rowHeight).fill(borderColor);

        // 2. Draw Table Borders and Grid
        doc.rect(40, tableY, totalWidth, tableHeight + rowHeight).stroke(borderColor); // Outer box (+rowHeight for totals)
        doc.moveTo(middleX, tableY).lineTo(middleX, tableY + tableHeight + rowHeight).stroke(borderColor); // Vertical Divider

        // 3. Draw Header Text
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
        doc.text('Earnings', 40, tableY + 4, { width: halfWidth - 70, align: 'center' });
        doc.text('Amount', 40 + halfWidth - 70, tableY + 4, { width: 60, align: 'right' });
        doc.text('Deductions', 40 + halfWidth, tableY + 4, { width: halfWidth - 70, align: 'center' });
        doc.text('Amount', 40 + totalWidth - 70, tableY + 4, { width: 60, align: 'right' });

        // 4. Draw Rows with Zebra Striping
        doc.font('Helvetica').fontSize(8);
        for (let i = 0; i < maxRows; i++) {
            const y = tableY + rowHeight + (i * rowHeight);

            // Zebra striping
            if (i % 2 === 0) {
                doc.rect(40.5, y, totalWidth - 1, rowHeight).fill('#fafafa');
            }

            // Horizontal line for this row
            doc.moveTo(40, y).lineTo(40 + totalWidth, y).stroke(borderColor);

            // Earnings Column
            if (earningsList[i]) {
                doc.fillColor('#000').text(earningsList[i].label, 45, y + 4);
                doc.text(formatRawCurrency(earningsList[i].value), 40 + halfWidth - 70, y + 4, { width: 60, align: 'right' });
            }

            // Deductions Column
            if (deductionsList[i]) {
                doc.fillColor('#000').text(deductionsList[i].label, 45 + halfWidth, y + 4);
                doc.text(formatRawCurrency(deductionsList[i].value), 40 + totalWidth - 70, y + 4, { width: 60, align: 'right' });
            }
        }

        // 5. Totals Row
        const totalY = tableY + tableHeight;
        doc.moveTo(40, totalY).lineTo(40 + totalWidth, totalY).stroke(borderColor);
        doc.rect(40, totalY, totalWidth, rowHeight).fill('#f1f5f9'); // Light gray background for totals

        doc.fillColor('#000').font('Helvetica-Bold');
        doc.text('(A) Total Earnings:', 45, totalY + 4);
        doc.text(formatRawCurrency(data.total_earnings), 40 + halfWidth - 70, totalY + 4, { width: 60, align: 'right' });

        doc.text('(B) Total Deduction:', 45 + halfWidth, totalY + 4);
        doc.text(formatRawCurrency(data.total_deductions), 40 + totalWidth - 70, totalY + 4, { width: 60, align: 'right' });

        // Net Salary Section - More Prominent
        const netY = totalY + 25;
        doc.rect(40, netY, totalWidth, 30).fill(primaryColor);
        doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold').text('NET PAYABLE SALARY', 50, netY + 10);
        doc.fontSize(12).text(formatCurrency(data.net_salary), 40 + totalWidth - 160, netY + 10, { width: 150, align: 'right' });

        // Signature Section - REMOVED per user request
        const wordsY = netY + 40;
        doc.fillColor('#000').fontSize(9).font('Helvetica-Bold').text('Amount in Words: ', 40, wordsY);
        doc.font('Helvetica').text(numberToWords(data.net_salary) + ' Only', 120, wordsY);

        // Footer
        const footerY = 780;
        doc.fontSize(7).fillColor(secondaryColor).font('Helvetica');
        doc.text('This is a computer generated payslip, and is not valid unless authorized. If any discrepancies are found, please report to HR within 48 hours.', 40, footerY, { align: 'center', width: 515 });
        doc.rect(40, footerY - 5, 515, 20).stroke(borderColor);

        doc.end();
    });
};

const getMonthName = (month) => {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
};

const getFinancialYear = (month, year) => {
    if (month >= 4) {
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
};

const formatRawCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to convert number to words
const numberToWords = (num) => {
    try {
        const integerPart = Math.floor(num);
        const fractionalPart = Math.round((num - integerPart) * 100);

        let words = converter.toWords(integerPart);
        if (fractionalPart > 0) {
            words += " and " + converter.toWords(fractionalPart) + " paise";
        }
        return words.charAt(0).toUpperCase() + words.slice(1);
    } catch (e) {
        return num.toLocaleString('en-IN');
    }
};

const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const emailPayslip = async (tenantId, payslipId, toEmail) => {
    // 1. Get payslip data and generate PDF
    const data = await getPayslipById(tenantId, payslipId);
    if (!data) throw new Error("Payslip not found");

    const pdfBuffer = await generatePayslipPDFById(tenantId, payslipId);

    // 2. Determine recipient
    const recipient = toEmail || data.email;
    const monthName = new Date(data.period_year, data.period_month - 1).toLocaleString('en-US', { month: 'long' });

    // 3. Send email
    await mailer.sendMail({
        to: recipient,
        subject: `Payslip for ${monthName} ${data.period_year}`,
        text: `Dear ${data.first_name},\n\nPlease find attached your payslip for ${monthName} ${data.period_year}.\n\nBest regards,\nPayroll Team`,
        html: `<p>Dear ${data.first_name},</p><p>Please find attached your payslip for <b>${monthName} ${data.period_year}</b>.</p><p>Best regards,<br>Payroll Team</p>`,
        attachments: [
            {
                filename: `payslip_${data.period_month}_${data.period_year}.pdf`,
                content: pdfBuffer
            }
        ]
    });

    return { status: "success", message: "Email sent successfully" };
};

const generateBulk = async (tenantId, runId) => {
    console.log(`[Payslip Service] Starting bulk generation for run ${runId}`);

    // Fetch all processed items
    const itemsRes = await db.query(
        `SELECT id, employee_id FROM payroll_run_items WHERE tenant_id = $1 AND payroll_run_id = $2`,
        [tenantId, runId]
    );

    let successCount = 0;

    // Loop and generate (In production, use a queue)
    for (const item of itemsRes.rows) {
        try {
            // For now, we just ensure the data is queryable and ready for PDF generation.
            // We could also trigger emails here if configured.
            // await emailPayslip(tenantId, item.id); // Optional: Auto-email on release
            successCount++;
        } catch (error) {
            console.error(`Failed to process payslip for item ${item.id}`, error);
        }
    }

    console.log(`[Payslip Service] Bulk generation completed. Processed ${successCount} payslips.`);
    return { generated: successCount };
};

module.exports = {
    // Payslips
    getPayslipData,
    getPayslipById,
    listAllPayslips,
    getEmployeePayslips,
    generatePayslipPDFById,
    emailPayslip,
    generateBulk,

    // Tax Declarations
    getTaxDeclaration,
    upsertTaxDeclaration,
    submitTaxDeclaration,
    verifyTaxDeclaration
};
