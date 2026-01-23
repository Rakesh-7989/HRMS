const payslipService = require("./payslip.service");

// Payslips
const getMyPayslips = async (req, res) => {
    const data = await payslipService.getEmployeePayslips(req.user.tenantId, req.user.employeeId);
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
        const { employeeId } = req.params;

        // IDOR Protection: Employees can only download their own payslips
        if (req.user.employeeId !== employeeId && !['HR', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ status: "error", message: "Access denied" });
        }

        const pdf = await payslipService.generatePayslipPDF(
            req.user.tenantId,
            req.params.payrollRunId,
            employeeId
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip_${req.params.payrollRunId}.pdf`);
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
    getMyPayslips,
    getPayslipData,
    downloadPayslip,
    getMyTaxDeclaration,
    saveTaxDeclaration,
    submitTaxDeclaration,
    verifyTaxDeclaration
};
