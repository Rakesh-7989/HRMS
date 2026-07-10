const leaveReportService = require("./leaveReport.service");

exports.getLeaveTrendReport = async (req, res, next) => {
    try {
        const result = await leaveReportService.getLeaveTrendReport(null, req.user.tenantId, req.query, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getAbsenteeismReport = async (req, res, next) => {
    try {
        const result = await leaveReportService.getAbsenteeismReport(null, req.user.tenantId, req.query, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getDepartmentWiseReport = async (req, res, next) => {
    try {
        const result = await leaveReportService.getDepartmentWiseReport(null, req.user.tenantId, req.query, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getEmployeeLeaveReport = async (req, res, next) => {
    try {
        const result = await leaveReportService.getEmployeeLeaveReport(
            null, req.params.employeeId, req.user.tenantId, req.query
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getPendingAgeingReport = async (req, res, next) => {
    try {
        const result = await leaveReportService.getPendingAgeingReport(null, req.user.tenantId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getUpcomingLeavesReport = async (req, res, next) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const result = await leaveReportService.getUpcomingLeavesReport(null, req.user.tenantId, days);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
