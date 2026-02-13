const PDFDocument = require('pdfkit');
const db = require("../../../config/db");
const { format } = require('date-fns');

const generateForm16PartB = async (tenantId, employeeId, fy) => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Fetch Employee Details
            const empRes = await db.query(
                `SELECT e.*, d.name as designation, dep.name as department
                 FROM employees e
                 LEFT JOIN designations d ON d.id = e.designation_id
                 LEFT JOIN departments dep ON dep.id = e.department_id
                 WHERE e.id = $1 AND e.tenant_id = $2`,
                [employeeId, tenantId]
            );
            const employee = empRes.rows[0];
            if (!employee) throw new Error("Employee not found");

            // 2. Fetch Payroll Data (Actual paid in FY)
            // FY 2024-2025 means April 2024 to March 2025
            const [startYear, endYear] = fy.split('-').map(y => parseInt(y));

            const salaryRes = await db.query(
                `SELECT COALESCE(SUM(pri.gross_salary), 0) as total_gross,
                        COALESCE(SUM(pri.net_salary), 0) as total_net,
                        COALESCE(SUM(pri.total_deductions), 0) as total_deductions,
                        COALESCE(SUM(pri.tds), 0) as total_tax_paid,
                        COALESCE(SUM(pri.professional_tax), 0) as total_pt,
                        COALESCE(SUM(pri.pf_employee), 0) as total_pf
                 FROM payroll_run_items pri
                 JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
                 WHERE pri.employee_id = $1 AND pri.tenant_id = $2
                   AND (
                     (pr.period_year = $3 AND pr.period_month >= 4) OR
                     (pr.period_year = $4 AND pr.period_month <= 3)
                   )
                   AND pr.status = 'RELEASED'`,
                [employeeId, tenantId, startYear, endYear]
            );
            const salaryParams = salaryRes.rows[0];

            // 3. Fetch Approved Declarations
            const decRes = await db.query(
                `SELECT d.approved_amount, s.section, s.name
                 FROM it_declarations d
                 JOIN tax_sections s ON s.id = d.section_id
                 WHERE d.tenant_id = $1 AND d.employee_id = $2 AND d.financial_year = $3
                   AND d.status = 'APPROVED'`,
                [tenantId, employeeId, fy]
            );
            const declarations = decRes.rows;

            // 4. Fetch Regime
            const regimeRes = await db.query(
                `SELECT regime FROM employee_tax_regimes 
                 WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3`,
                [tenantId, employeeId, fy]
            );
            const regime = regimeRes.rows[0]?.regime || 'NEW';

            // 5. Generate PDF
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- HEADER ---
            doc.fontSize(16).text('FORM 16 - PART B', { align: 'center', underline: true });
            doc.moveDown();
            doc.fontSize(10).text(`Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary`, { align: 'center' });
            doc.moveDown();

            // --- DETAILS ---
            doc.text(`Financial Year: ${fy}`, { align: 'right' });
            doc.moveDown();

            doc.font('Helvetica-Bold').text('Employee Details:');
            doc.font('Helvetica').text(`Name: ${employee.first_name} ${employee.last_name}`);
            doc.text(`PAN: ${employee.pan_number || 'NA'}`);
            doc.text(`Designation: ${employee.designation || 'NA'}`);
            doc.moveDown();

            // --- COMPUTATION ---
            doc.font('Helvetica-Bold').text('Annexure: Details of Salary Paid and any other income and tax deducted');
            doc.moveDown();

            const startX = 50;
            let currentY = doc.y;
            const col1 = 50, col2 = 350, col3 = 450;

            const row = (label, amount, bold = false) => {
                if (bold) doc.font('Helvetica-Bold');
                else doc.font('Helvetica');

                doc.text(label, col1, currentY);
                if (amount !== null) {
                    doc.text(parseFloat(amount).toFixed(2), col3, currentY, { align: 'right', width: 100 });
                }
                currentY += 20;
            };

            row('1. Gross Salary', salaryParams.total_gross, true);
            row('   (a) Salary as per provisions of sec. 17(1)', salaryParams.total_gross);
            row('   (b) Value of perquisites u/s 17(2)', '0.00');
            row('   (c) Profits in lieu of salary u/s 17(3)', '0.00');

            currentY += 10;
            row('2. Less: Allowances to the extent exempt u/s 10', null, true);

            // HRA exemption logic would go here, simplified for now
            // Assume exemptions come from declarations or payroll items?
            // For now, listing Standard Deduction
            let stdDeduction = 50000;
            if (regime === 'NEW' && startYear >= 2023) stdDeduction = 50000; // New regime also has std ded from FY 23-24

            row('3. Balance (1 - 2)', salaryParams.total_gross, true);

            currentY += 10;
            row('4. Deductions:', null, true);
            row('   (a) Standard Deduction u/s 16(ia)', stdDeduction);
            row('   (b) Professional Tax u/s 16(iii)', salaryParams.total_pt);

            const incomeChargableHeadSalaries = salaryParams.total_gross - stdDeduction - parseFloat(salaryParams.total_pt);

            currentY += 10;
            row('5. Income chargeable under the head "Salaries" (3 - 4)', incomeChargableHeadSalaries, true);

            currentY += 10;
            row('6. Any other income reported by the employee', '0.00');

            currentY += 10;
            row('7. Gross Total Income (5 + 6)', incomeChargableHeadSalaries, true);

            currentY += 10;
            row('8. Deductions under Chapter VI-A', null, true);

            let totalChapterVIA = 0;
            if (regime === 'OLD') {
                declarations.forEach(d => {
                    row(`   ${d.section} - ${d.name}`, d.approved_amount);
                    totalChapterVIA += parseFloat(d.approved_amount);
                });
                // Add PF
                if (parseFloat(salaryParams.total_pf) > 0) {
                    row('   80C - EPF Contribution', salaryParams.total_pf);
                    totalChapterVIA += parseFloat(salaryParams.total_pf);
                }
            } else {
                row('   (Not applicable in New Regime)', '0.00');
            }

            row('9. Total Deductions under Chapter VI-A', totalChapterVIA, true);

            const totalIncome = Math.max(0, incomeChargableHeadSalaries - totalChapterVIA);
            currentY += 10;
            row('10. Total Income (7 - 9)', totalIncome, true);

            // Tax Calculation (Simplified Slab for Demo)
            // Real implementation needs full slab logic
            let taxPayable = 0; // TODO: Implement calculateTax(totalIncome, regime, age)

            row('11. Tax on Total Income', taxPayable); // Placeholder
            row('12. Rebate u/s 87A', '0.00');
            row('13. Surcharge', '0.00');
            row('14. Health and Education Cess', '0.00');
            row('15. Tax Payable (11+13+14-12)', taxPayable, true);
            row('16. Less: Relief u/s 89', '0.00');
            row('17. Net Tax Payable', taxPayable, true);
            row('18. Tax Deducted at Source (TDS)', salaryParams.total_tax_paid, true);

            const taxDue = taxPayable - parseFloat(salaryParams.total_tax_paid);
            const refund = taxDue < 0 ? Math.abs(taxDue) : 0;
            const payable = taxDue > 0 ? taxDue : 0;

            row('19. Tax Payable / (Refundable)', payable > 0 ? payable : `(${refund})`, true);


            // --- FOOTER ---
            doc.moveDown(2);
            doc.text('Valid for assessment year 2025-2026');
            doc.text('This is a computer generated certificate.', { align: 'center', oblique: true });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateForm16PartB };
