const express = require("express");
const router = express.Router();

const verifyJwt = require("../../middleware/verifyJwt");
const validate = require("../../middleware/validate");
const requirePermission = require("../../middleware/requirePermission");

const controller = require("./engagement.controller");
const validator = require("./engagement.validator");

router.use(verifyJwt);

router.get("/surveys", requirePermission("engagement", "view"), validate(validator.getSurveysSchema), controller.getSurveys);
router.post("/surveys", requirePermission("engagement", "create"), validate(validator.createSurveySchema), controller.createSurvey);
router.post("/surveys/:surveyId/respond", requirePermission("engagement", "create"), validate(validator.submitResponseSchema), controller.submitResponse);

router.get("/recognition", requirePermission("engagement", "view"), validate(validator.getRecognitionSchema), controller.getRecognition);
router.post("/recognition", requirePermission("engagement", "create"), validate(validator.sendRecognitionSchema), controller.sendRecognition);

router.get("/celebrations", requirePermission("engagement", "view"), validate(validator.getCelebrationsSchema), controller.getCelebrations);

module.exports = router;
