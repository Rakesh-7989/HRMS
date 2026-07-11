const performanceService = require("./performance.service");
const logger = require("../../config/logger");

exports.getCycles = async (req, res) => {
    try {
        const data = await performanceService.getCycles(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getCycles Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCycle = async (req, res) => {
    try {
        const data = await performanceService.getCycle(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Cycle not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getCycle Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createCycle = async (req, res) => {
    try {
        const data = await performanceService.createCycle(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] createCycle Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateCycle = async (req, res) => {
    try {
        const data = await performanceService.updateCycle(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Cycle not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] updateCycle Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.closeCycle = async (req, res) => {
    try {
        const data = await performanceService.closeCycle(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Cycle not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] closeCycle Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const { cycle_id } = req.query;
        const data = await performanceService.getReviews(req.db, req.user.tenantId, cycle_id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getReviews Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getMyReviews = async (req, res) => {
    try {
        const data = await performanceService.getMyReviews(req.db, req.user.tenantId, req.user.id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getMyReviews Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.submitReview = async (req, res) => {
    try {
        const data = await performanceService.submitReview(req.db, req.user.tenantId, req.params.id, req.body.rating, req.body.comments);
        if (!data) return res.status(404).json({ status: "error", message: "Review not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] submitReview Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.acknowledgeReview = async (req, res) => {
    try {
        const data = await performanceService.acknowledgeReview(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Review not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] acknowledgeReview Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getGoals = async (req, res) => {
    try {
        const { employee_id } = req.query;
        const data = await performanceService.getGoals(req.db, req.user.tenantId, employee_id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getGoals Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getMyGoals = async (req, res) => {
    try {
        const data = await performanceService.getMyGoals(req.db, req.user.tenantId, req.user.id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getMyGoals Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createGoal = async (req, res) => {
    try {
        const data = await performanceService.createGoal(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] createGoal Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateGoal = async (req, res) => {
    try {
        const data = await performanceService.updateGoal(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Goal not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] updateGoal Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateGoalProgress = async (req, res) => {
    try {
        const data = await performanceService.updateGoalProgress(req.db, req.user.tenantId, req.params.id, req.body.current_value);
        if (!data) return res.status(404).json({ status: "error", message: "Goal not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] updateGoalProgress Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getFeedbackRequests = async (req, res) => {
    try {
        const data = await performanceService.getFeedbackRequests(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getFeedbackRequests Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getPendingFeedback = async (req, res) => {
    try {
        const data = await performanceService.getPendingFeedback(req.db, req.user.tenantId, req.user.id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getPendingFeedback Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.requestFeedback = async (req, res) => {
    try {
        const data = await performanceService.requestFeedback(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] requestFeedback Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const data = await performanceService.submitFeedbackResponse(req.db, req.user.tenantId, req.params.id, req.body.response);
        if (!data) return res.status(404).json({ status: "error", message: "Feedback request not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] submitFeedback Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getTemplates = async (req, res) => {
    try {
        const data = await performanceService.getTemplates(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] getTemplates Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const data = await performanceService.createTemplate(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] createTemplate Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const data = await performanceService.updateTemplate(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Template not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[PerfController] updateTemplate Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
