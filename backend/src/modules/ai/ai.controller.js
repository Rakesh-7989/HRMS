const aiService = require("./ai.service");
const logger = require("../../config/logger");

exports.getInsights = async (req, res) => {
    try {
        const data = await aiService.getInsights(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] getInsights Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.parseResume = async (req, res) => {
    try {
        const data = await aiService.parseResume(req.db, req.user.tenantId, req.user.id, req.file);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] parseResume Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.analyzeSentiment = async (req, res) => {
    try {
        const data = await aiService.analyzeSentiment(req.db, req.user.tenantId, req.params.surveyId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] analyzeSentiment Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getSkillGaps = async (req, res) => {
    try {
        const { role_id } = req.query;
        const data = await aiService.getSkillGaps(req.db, req.user.tenantId, req.params.employeeId, role_id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] getSkillGaps Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.generateContent = async (req, res) => {
    try {
        const data = await aiService.generateContent(req.db, req.user.tenantId, req.user.id, req.body.prompt, req.body.context);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] generateContent Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.chat = async (req, res) => {
    try {
        const data = await aiService.chat(req.db, req.user.tenantId, req.user.id, req.body.message, req.body.history);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] chat Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.matchCandidates = async (req, res) => {
    try {
        const data = await aiService.matchCandidates(req.db, req.user.tenantId, req.params.jobId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[AIController] matchCandidates Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
