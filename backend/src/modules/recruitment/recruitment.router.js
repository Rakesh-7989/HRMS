const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./recruitment.controller");
const validator = require("./recruitment.validator");

router.use(verifyJwt);

router.get("/jobs", requirePermission("recruitment", "view"), validate(validator.getJobsSchema), controller.getJobs);
router.get("/jobs/:id", requirePermission("recruitment", "view"), validate(validator.getJobSchema), controller.getJob);
router.post("/jobs", requirePermission("recruitment", "create"), validate(validator.createJobSchema), controller.createJob);
router.put("/jobs/:id", requirePermission("recruitment", "update"), validate(validator.updateJobSchema), controller.updateJob);
router.post("/jobs/:id/publish", requirePermission("recruitment", "publish"), validate(validator.publishJobSchema), controller.publishJob);
router.post("/jobs/:id/close", requirePermission("recruitment", "manage"), validate(validator.closeJobSchema), controller.closeJob);

router.get("/candidates", requirePermission("recruitment", "view"), validate(validator.getCandidatesSchema), controller.getCandidates);
router.get("/candidates/:id", requirePermission("recruitment", "view"), validate(validator.getCandidateSchema), controller.getCandidate);
router.post("/candidates", requirePermission("recruitment", "create"), validate(validator.addCandidateSchema), controller.addCandidate);
router.patch("/candidates/:id", requirePermission("recruitment", "update"), validate(validator.updateCandidateStatusSchema), controller.updateCandidateStatus);

router.get("/interviews", requirePermission("recruitment", "view"), validate(validator.getInterviewsSchema), controller.getInterviews);
router.post("/interviews", requirePermission("recruitment", "interview"), validate(validator.scheduleInterviewSchema), controller.scheduleInterview);
router.put("/interviews/:id", requirePermission("recruitment", "update"), validate(validator.updateInterviewSchema), controller.updateInterview);
router.put("/interviews/:id/feedback", requirePermission("recruitment", "interview"), validate(validator.submitFeedbackSchema), controller.submitFeedback);

module.exports = router;
