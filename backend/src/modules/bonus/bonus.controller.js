const bonusService = require("./bonus.service");
const logger = require("../../config/logger");

exports.getPlans = async (req, res) => {
    try {
        const data = await bonusService.getPlans(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] getPlans Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const data = await bonusService.createPlan(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] createPlan Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const data = await bonusService.updatePlan(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Bonus plan not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] updatePlan Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getEmployeeBonuses = async (req, res) => {
    try {
        const { status } = req.query;
        const data = await bonusService.getEmployeeBonuses(req.db, req.user.tenantId, status);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] getEmployeeBonuses Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createEmployeeBonus = async (req, res) => {
    try {
        const data = await bonusService.createEmployeeBonus(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] createEmployeeBonus Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.approveBonus = async (req, res) => {
    try {
        const data = await bonusService.approveBonus(req.db, req.user.tenantId, req.params.id, req.user.id);
        if (!data) return res.status(400).json({ status: "error", message: "Bonus not found or not in PENDING status" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] approveBonus Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.payBonus = async (req, res) => {
    try {
        const data = await bonusService.payBonus(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(400).json({ status: "error", message: "Bonus not found or not in APPROVED status" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] payBonus Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCommissions = async (req, res) => {
    try {
        const data = await bonusService.getCommissions(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] getCommissions Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createCommission = async (req, res) => {
    try {
        const data = await bonusService.createCommission(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] createCommission Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateCommission = async (req, res) => {
    try {
        const data = await bonusService.updateCommission(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Commission structure not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[BonusController] updateCommission Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
