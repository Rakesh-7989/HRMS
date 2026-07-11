const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./performance.controller");
const validator = require("./performance.validator");

router.use(verifyJwt);

router.get("/cycles", requirePermission("performance", "view"), validate(validator.getCyclesSchema), controller.getCycles);
router.get("/cycles/:id", requirePermission("performance", "view"), validate(validator.getCycleSchema), controller.getCycle);
router.post("/cycles", requirePermission("performance", "create"), validate(validator.createCycleSchema), controller.createCycle);
router.put("/cycles/:id", requirePermission("performance", "update"), validate(validator.updateCycleSchema), controller.updateCycle);
router.post("/cycles/:id/close", requirePermission("performance", "manage"), validate(validator.closeCycleSchema), controller.closeCycle);

router.get("/reviews", requirePermission("performance", "view"), validate(validator.getReviewsSchema), controller.getReviews);
router.get("/reviews/my", requirePermission("performance", "view"), validate(validator.getMyReviewsSchema), controller.getMyReviews);
router.put("/reviews/:id", requirePermission("performance", "review"), validate(validator.submitReviewSchema), controller.submitReview);
router.post("/reviews/:id/acknowledge", requirePermission("performance", "acknowledge"), validate(validator.acknowledgeReviewSchema), controller.acknowledgeReview);

router.get("/goals", requirePermission("performance", "view"), validate(validator.getGoalsSchema), controller.getGoals);
router.get("/goals/my", requirePermission("performance", "view"), validate(validator.getMyGoalsSchema), controller.getMyGoals);
router.post("/goals", requirePermission("performance", "create"), validate(validator.createGoalSchema), controller.createGoal);
router.put("/goals/:id", requirePermission("performance", "update"), validate(validator.updateGoalSchema), controller.updateGoal);
router.patch("/goals/:id", requirePermission("performance", "update"), validate(validator.updateGoalProgressSchema), controller.updateGoalProgress);

router.get("/feedback", requirePermission("performance", "view"), validate(validator.getFeedbackRequestsSchema), controller.getFeedbackRequests);
router.get("/feedback/pending", requirePermission("performance", "view"), validate(validator.getPendingFeedbackSchema), controller.getPendingFeedback);
router.post("/feedback", requirePermission("performance", "create"), validate(validator.requestFeedbackSchema), controller.requestFeedback);
router.put("/feedback/:id", requirePermission("performance", "update"), validate(validator.submitFeedbackSchema), controller.submitFeedback);

router.get("/templates", requirePermission("performance", "view"), validate(validator.getTemplatesSchema), controller.getTemplates);
router.post("/templates", requirePermission("performance", "manage_templates"), validate(validator.createTemplateSchema), controller.createTemplate);
router.put("/templates/:id", requirePermission("performance", "manage_templates"), validate(validator.updateTemplateSchema), controller.updateTemplate);

module.exports = router;
