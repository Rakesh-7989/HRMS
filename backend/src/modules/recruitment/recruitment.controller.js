const recruitmentService = require("./recruitment.service");
const logger = require("../../config/logger");

exports.getJobs = async (req, res) => {
    try {
        const { status } = req.query;
        const data = await recruitmentService.getJobs(req.db, req.user.tenantId, status);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] getJobs Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getJob = async (req, res) => {
    try {
        const data = await recruitmentService.getJob(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Job not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] getJob Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createJob = async (req, res) => {
    try {
        const data = await recruitmentService.createJob(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] createJob Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateJob = async (req, res) => {
    try {
        const data = await recruitmentService.updateJob(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Job not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] updateJob Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.publishJob = async (req, res) => {
    try {
        const data = await recruitmentService.publishJob(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Job not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] publishJob Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.closeJob = async (req, res) => {
    try {
        const data = await recruitmentService.closeJob(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Job not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] closeJob Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCandidates = async (req, res) => {
    try {
        const { job_id } = req.query;
        const data = await recruitmentService.getCandidates(req.db, req.user.tenantId, job_id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] getCandidates Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCandidate = async (req, res) => {
    try {
        const data = await recruitmentService.getCandidate(req.db, req.user.tenantId, req.params.id);
        if (!data) return res.status(404).json({ status: "error", message: "Candidate not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] getCandidate Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.addCandidate = async (req, res) => {
    try {
        const data = await recruitmentService.addCandidate(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] addCandidate Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateCandidateStatus = async (req, res) => {
    try {
        const data = await recruitmentService.updateCandidateStatus(req.db, req.user.tenantId, req.params.id, req.body.status);
        if (!data) return res.status(404).json({ status: "error", message: "Candidate not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] updateCandidateStatus Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getInterviews = async (req, res) => {
    try {
        const { candidate_id } = req.query;
        const data = await recruitmentService.getInterviews(req.db, req.user.tenantId, candidate_id);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] getInterviews Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.scheduleInterview = async (req, res) => {
    try {
        const data = await recruitmentService.scheduleInterview(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] scheduleInterview Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.updateInterview = async (req, res) => {
    try {
        const data = await recruitmentService.updateInterview(req.db, req.user.tenantId, req.params.id, req.body);
        if (!data) return res.status(404).json({ status: "error", message: "Interview not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] updateInterview Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const data = await recruitmentService.submitFeedback(req.db, req.user.tenantId, req.params.id, req.body.feedback, req.body.rating);
        if (!data) return res.status(404).json({ status: "error", message: "Interview not found" });
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[RecruitmentController] submitFeedback Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
