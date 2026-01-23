const leaveTypeService = require("./leaveType.service");
const logger = require("../../../config/logger");

exports.createLeaveType = async (req, res, next) => {
    try {
        const result = await leaveTypeService.createLeaveType(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getLeaveTypes = async (req, res, next) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const result = await leaveTypeService.getLeaveTypes(null, req.user.tenantId, includeInactive);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getLeaveTypeById = async (req, res, next) => {
    try {
        const result = await leaveTypeService.getLeaveTypeById(null, req.params.id, req.user.tenantId);
        if (!result) return res.status(404).json({ error: "Leave type not found" });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.updateLeaveType = async (req, res, next) => {
    try {
        const result = await leaveTypeService.updateLeaveType(null, req.params.id, req.body, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.deleteLeaveType = async (req, res, next) => {
    try {
        const result = await leaveTypeService.deleteLeaveType(null, req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
