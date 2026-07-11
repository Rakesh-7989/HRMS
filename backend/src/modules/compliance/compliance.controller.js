const complianceService = require("./compliance.service");
const logger = require("../../config/logger");

exports.getReports = async (req, res) => {
    try {
        const { type } = req.query;
        const data = await complianceService.getReports(req.db, req.user.tenantId, type);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[ComplianceController] getReports Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.generateReport = async (req, res) => {
    try {
        const data = await complianceService.generateReport(req.db, req.user.tenantId, req.user.id, req.body);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[ComplianceController] generateReport Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const report = await complianceService.getReportFile(req.db, req.user.tenantId, req.params.id);
        if (!report) return res.status(404).json({ status: "error", message: "Report not found" });
        const csv = `Type,Month,Year,Employees,Amount\n${report.type},${report.period_month},${report.period_year},${report.employee_count},${report.total_amount || 0}`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${report.type}_${report.period_month}_${report.period_year}.csv"`);
        res.send(csv);
    } catch (error) {
        logger.error(`[ComplianceController] downloadReport Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const data = await complianceService.getSummary(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[ComplianceController] getSummary Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getForm16 = async (req, res) => {
    try {
        const data = await complianceService.getForm16Data(req.db, req.user.tenantId, req.params.employeeId, req.query.year);
        if (!data) return res.status(404).json({ status: "error", message: "Employee not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[ComplianceController] getForm16 Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
