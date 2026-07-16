const PDFDocument = require('pdfkit');
const db = require("../../../config/db");

const generateForm16PartB = async (tenantId, employeeId, fy) => {
    return new Promise((resolve, reject) => {
        (async () => {
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
                        COALESCE(SUM(pri.pf_employee), 0) as total_pf,
                        COALESCE(SUM(pri.basic), 0) as total_basic,
                        COALESCE(SUM(pri.hra), 0) as total_hra
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
                `SELECT d.approved_amount, s.section, s.name, d.status, d.metadata
                 FROM it_declarations d
                 JOIN tax_sections s ON s.id = d.section_id
                 WHERE d.tenant_id = $1 AND d.employee_id = $2 AND d.financial_year = $3
                   AND d.status = 'APPROVED'`,
                [tenantId, employeeId, fy]
            );
            const declarationsList = decRes.rows;

            // 4. Fetch Regime
            const regimeRes = await db.query(
                `SELECT regime FROM employee_tax_regimes 
                 WHERE tenant_id = $1 AND employee_id = $2 AND financial_year = $3`,
                [tenantId, employeeId, fy]
            );
            const regime = regimeRes.rows[0]?.regime || 'NEW';

            // 5. Preparation for TDS Calculator
            const statutoryCalculator = require('../utils/statutoryCalculator');
            const hraDeclaration = declarationsList.find(d => d.section === 'HRA');
            const rentPaid = parseFloat(hraDeclaration?.metadata?.rent_paid || 0);
            const isMetro = !!hraDeclaration?.metadata?.is_metro;

            const tdsInput = {
                regime,
                annual_basic: parseFloat(salaryParams.total_basic),
                actual_hra: parseFloat(salaryParams.total_hra),
                rent_paid: rentPaid,
                is_metro: isMetro,
                investments_80c: declarationsList.filter(d => d.section === '80C').reduce((s, d) => s + parseFloat(d.approved_amount), 0),
                investments_80d: declarationsList.filter(d => d.section === '80D').reduce((s, d) => s + parseFloat(d.approved_amount), 0),
                other_exemptions: declarationsList.filter(d => !['80C', '80D', 'HRA'].includes(d.section)).reduce((s, d) => s + parseFloat(d.approved_amount), 0)
            };

            const dob = employee.date_of_birth;
            const today = new Date();
            const birthDate = new Date(dob);
            let age = dob ? today.getFullYear() - birthDate.getFullYear() : 30;

            const tdsResult = statutoryCalculator.calculateTDS(parseFloat(salaryParams.total_gross), tdsInput, age);

            // 6. Generate PDF
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

            const col1 = 50, col3 = 450;
            let currentY = doc.y;

            const row = (label, amount, bold = false) => {
                if (bold) doc.font('Helvetica-Bold');
                else doc.font('Helvetica');

                doc.text(label, col1, currentY);
                if (amount !== null) {
                    doc.text(parseFloat(amount).toFixed(2), col3, currentY, { align: 'right', width: 100 });
                }
                currentY += 20;
                if (currentY > 700) { doc.addPage(); currentY = 50; }
            };

            row('1. Gross Salary', salaryParams.total_gross, true);
            row('   (a) Salary as per provisions of sec. 17(1)', salaryParams.total_gross);
            row('   (b) Value of perquisites u/s 17(2)', '0.00');
            row('   (c) Profits in lieu of salary u/s 17(3)', '0.00');

            currentY += 10;
            row('2. Less: Allowances to the extent exempt u/s 10', null, true);
            row('   Exempt HRA u/s 10(13A)', tdsResult.hraExemption);

            row('3. Balance (1 - 2)', parseFloat(salaryParams.total_gross) - tdsResult.hraExemption, true);

            currentY += 10;
            row('4. Deductions:', null, true);
            row('   (a) Standard Deduction u/s 16(ia)', tdsResult.breakdown.stdDeduction);
            row('   (b) Professional Tax u/s 16(iii)', salaryParams.total_pt);

            const incomeChargableHeadSalaries = tdsResult.annualGross - tdsResult.hraExemption - tdsResult.breakdown.stdDeduction - parseFloat(salaryParams.total_pt);

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
                declarationsList.forEach(d => {
                    if (['80C', '80D'].includes(d.section)) {
                        row(`   ${d.section} - ${d.name}`, d.approved_amount);
                        totalChapterVIA += parseFloat(d.approved_amount);
                    }
                });
                // Add PF to 80C
                if (parseFloat(salaryParams.total_pf) > 0) {
                    row('   80C - EPF Contribution', salaryParams.total_pf);
                    totalChapterVIA += parseFloat(salaryParams.total_pf);
                }
                // Cap 80C
                // (Note: Proper implementation should cap 80C at 1.5L)
            } else {
                row('   (Not applicable in New Regime)', '0.00');
            }

            row('9. Total Deductions under Chapter VI-A', totalChapterVIA, true);

            currentY += 10;
            row('10. Total Income (7 - 9)', tdsResult.taxableIncome, true);

            currentY += 10;
            row('11. Tax on Total Income', tdsResult.breakdown.taxAmount);
            row('12. Rebate u/s 87A', tdsResult.breakdown.taxAmount === 0 && tdsResult.taxableIncome <= (regime === 'NEW' ? 1200000 : 500000) ? 'YES' : '0.00');
            row('13. Surcharge', tdsResult.breakdown.surcharge);
            row('14. Health and Education Cess', tdsResult.breakdown.cess);
            row('15. Tax Payable (11+13+14-12)', tdsResult.yearlyTax, true);
            row('16. Less: Relief u/s 89', '0.00');
            row('17. Net Tax Payable', tdsResult.yearlyTax, true);
            row('18. Tax Deducted at Source (TDS)', salaryParams.total_tax_paid, true);

            const taxDue = tdsResult.yearlyTax - parseFloat(salaryParams.total_tax_paid);
            const refund = taxDue < 0 ? Math.abs(taxDue) : 0;
            const payable = taxDue > 0 ? taxDue : 0;

            row('19. Tax Payable / (Refundable)', payable > 0 ? payable : `(${refund})`, true);


            // --- FOOTER ---
            doc.moveDown(2);
            doc.text('Valid for assessment year 2025-2026');
            doc.text('This is a computer generated certificate.', { align: 'center', oblique: true });

            doc.end();

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[generateForm16PartB] Error:', {
                message: error.message,
                stack: error.stack,
                employeeId,
                tenantId,
                fy
            });
            reject(error);
        }
        })();
    });
};

module.exports = { generateForm16PartB };
