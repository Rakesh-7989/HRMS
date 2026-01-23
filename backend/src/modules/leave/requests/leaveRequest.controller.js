const leaveRequestService = require("./leaveRequest.service");

// Employee: Apply
exports.applyLeave = async (req, res, next) => {
    try {
        const result = await leaveRequestService.applyLeave(null, req.user.tenantId, req.user.employeeId, req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

// Employee: My Leaves
exports.getMyLeaves = async (req, res, next) => {
    try {
        const result = await leaveRequestService.getMyLeaves(null, req.user.tenantId, req.user.employeeId, req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Manager: Get Pending Approvals
exports.getPendingApprovals = async (req, res, next) => {
    try {
        const result = await leaveRequestService.getPendingApprovals(null, req.user, req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Manager: Approve
exports.approveLeave = async (req, res, next) => {
    try {
        const { comment } = req.body;
        const result = await leaveRequestService.approveLeave(null, req.user, req.params.id, comment);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Manager: Reject
exports.rejectLeave = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await leaveRequestService.rejectLeave(null, req.user, req.params.id, reason);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Employee: Cancel Approved Leave
exports.cancelApprovedLeave = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await leaveRequestService.cancelApprovedLeave(null, req.user.tenantId, req.user.employeeId, req.params.id, reason);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Admin: Leave Summary
exports.getLeaveSummary = async (req, res, next) => {
    try {
        const result = await leaveRequestService.getLeaveSummary(null, req.user.tenantId, req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
