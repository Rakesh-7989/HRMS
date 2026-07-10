const payslipService = require("./payslip.service");

// Payslips
const getMyPayslips = async (req, res) => {
    const data = await payslipService.getEmployeePayslips(req.user.tenantId, req.user.employeeId);
    res.json({ status: "success", data });
};

const getAllPayslips = async (req, res) => {
    const { from_date, to_date } = req.query;
    const data = await payslipService.listAllPayslips(req.user.tenantId, { from_date, to_date });
    res.json({ status: "success", data });
};

const getPayslipData = async (req, res) => {
    const { employeeId } = req.params;

    // IDOR Protection: Employees can only view their own payslips
    if (req.user.employeeId !== employeeId && !['HR', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ status: "error", message: "Access denied" });
    }

    const data = await payslipService.getPayslipData(
        req.user.tenantId,
        req.params.payrollRunId,
        employeeId
    );
    if (!data) {
        return res.status(404).json({ status: "error", message: "Payslip not found" });
    }
    res.json({ status: "success", data });
};

const downloadPayslip = async (req, res) => {
    try {
        const { id } = req.params; // Expects payslip ID (payroll_run_item.id)

        // 1. Fetch payslip data first to check ownership
        const data = await payslipService.getPayslipById(req.user.tenantId, id);

        if (!data) {
            return res.status(404).json({ status: "error", message: "Payslip not found" });
        }

        // 2. IDOR Protection: Employees can only download their own payslips
        if (req.user.employeeId !== data.employee_id && !['HR', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ status: "error", message: "Access denied" });
        }

        // 3. Generate PDF
        // We can reuse the data we just fetched instead of fetching again
        // However, generatePayslipPDFById also fetches. To avoid duplicate fetch, we should expose generatePDFFromData
        // But since I didn't export generatePDFFromData, I will use generatePayslipPDFById which is safe (just one extra query)
        // Or better: update service export to include generatePDFFromData?
        // Let's use generatePayslipPDFById for simplicity now as the overhead is minimal for a PDF download action.

        const pdf = await payslipService.generatePayslipPDFById(
            req.user.tenantId,
            id
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip_${data.period_month}_${data.period_year}.pdf`);
        res.send(pdf);
    } catch (err) {
        console.error('Payslip generation error:', err);
        res.status(500).json({ status: "error", message: err.message });
    }
};

// Tax Declarations
const getMyTaxDeclaration = async (req, res) => {
    const financialYear = req.query.fy || getCurrentFinancialYear();
    const data = await payslipService.getTaxDeclaration(
        req.user.tenantId,
        req.user.employeeId,
        financialYear
    );
    res.json({ status: "success", data: data || null });
};

const saveTaxDeclaration = async (req, res) => {
    const data = await payslipService.upsertTaxDeclaration(
        req.user.tenantId,
        req.user.employeeId,
        req.body
    );
    res.json({ status: "success", data });
};

const submitTaxDeclaration = async (req, res) => {
    const data = await payslipService.submitTaxDeclaration(req.user.tenantId, req.params.id);
    res.json({ status: "success", data, message: "Declaration submitted for verification" });
};

const verifyTaxDeclaration = async (req, res) => {
    const data = await payslipService.verifyTaxDeclaration(
        req.user.tenantId,
        req.params.id,
        req.user.id
    );
    res.json({ status: "success", data, message: "Declaration verified" });
};

const emailPayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const { to } = req.body;
        const tenantId = req.user.tenantId;

        const result = await payslipService.emailPayslip(tenantId, id, to);
        res.json(result);
    } catch (err) {
        console.error('Email payslip error:', err);
        res.status(500).json({ status: "error", message: err.message });
    }
};

// Helper
const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 3) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
    }
    return `${year - 1}-${year.toString().slice(-2)}`;
};

module.exports = {
    getAllPayslips,
    getMyPayslips,
    getPayslipData,
    downloadPayslip,
    emailPayslip,
    getMyTaxDeclaration,
    saveTaxDeclaration,
    submitTaxDeclaration,
    verifyTaxDeclaration
};
