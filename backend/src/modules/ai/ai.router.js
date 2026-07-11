const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./ai.controller");
const validator = require("./ai.validator");

router.use(verifyJwt);

router.get("/insights", requirePermission("ai", "view"), validate(validator.getInsightsSchema), controller.getInsights);
router.post("/parse-resume", requirePermission("ai", "use"), validate(validator.parseResumeSchema), controller.parseResume);
router.get("/sentiment/:surveyId", requirePermission("ai", "view"), validate(validator.analyzeSentimentSchema), controller.analyzeSentiment);
router.get("/skill-gaps/:employeeId", requirePermission("ai", "view"), validate(validator.getSkillGapsSchema), controller.getSkillGaps);
router.post("/generate", requirePermission("ai", "use"), validate(validator.generateContentSchema), controller.generateContent);
router.post("/chat", requirePermission("ai", "use"), validate(validator.chatSchema), controller.chat);
router.get("/match-candidates/:jobId", requirePermission("ai", "use"), validate(validator.matchCandidatesSchema), controller.matchCandidates);

module.exports = router;
