const engagementService = require("./engagement.service");
const logger = require("../../config/logger");

exports.getSurveys = async (req, res) => {
    try {
        const data = await engagementService.getSurveys(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] getSurveys Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createSurvey = async (req, res) => {
    try {
        const data = await engagementService.createSurvey(req.db, req.user.tenantId, req.user.employeeId, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] createSurvey Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.submitResponse = async (req, res) => {
    try {
        const data = await engagementService.submitResponse(req.db, req.params.surveyId, req.user.employeeId, req.body.answers);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] submitResponse Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getRecognition = async (req, res) => {
    try {
        const data = await engagementService.getRecognition(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] getRecognition Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.sendRecognition = async (req, res) => {
    try {
        const data = await engagementService.sendRecognition(req.db, req.user.tenantId, req.user.employeeId, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] sendRecognition Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCelebrations = async (req, res) => {
    try {
        const { month } = req.query;
        const data = await engagementService.getCelebrations(req.db, req.user.tenantId, month);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[EngagementController] getCelebrations Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
