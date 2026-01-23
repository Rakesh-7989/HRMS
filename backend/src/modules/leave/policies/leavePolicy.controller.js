const leavePolicyService = require("./leavePolicy.service");

exports.createPolicy = async (req, res, next) => {
    try {
        const result = await leavePolicyService.createPolicy(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getPolicies = async (req, res, next) => {
    try {
        const result = await leavePolicyService.getPolicies(null, req.user.tenantId, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getPolicyById = async (req, res, next) => {
    try {
        const result = await leavePolicyService.getPolicyById(null, req.params.id, req.user.tenantId);
        if (!result) return res.status(404).json({ error: "Policy not found" });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.updatePolicy = async (req, res, next) => {
    try {
        const result = await leavePolicyService.updatePolicy(null, req.params.id, req.body, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.deletePolicy = async (req, res, next) => {
    try {
        const result = await leavePolicyService.deletePolicy(null, req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.assignPolicyToEmployee = async (req, res, next) => {
    try {
        const result = await leavePolicyService.assignPolicyToEmployee(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.runAccrual = async (req, res, next) => {
    try {
        const result = await leavePolicyService.runMonthlyAccrual(null, req.user.tenantId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
