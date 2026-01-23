const delegationService = require("./delegation.service");

exports.createDelegation = async (req, res, next) => {
    try {
        const result = await delegationService.createDelegation(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getMyDelegations = async (req, res, next) => {
    try {
        const result = await delegationService.getMyDelegations(null, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getDelegationsToMe = async (req, res, next) => {
    try {
        const result = await delegationService.getDelegationsToMe(null, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.revokeDelegation = async (req, res, next) => {
    try {
        const result = await delegationService.revokeDelegation(null, req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getAllDelegations = async (req, res, next) => {
    try {
        const result = await delegationService.getAllActiveDelegations(null, req.user.tenantId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
