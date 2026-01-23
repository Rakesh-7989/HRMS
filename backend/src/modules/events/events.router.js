// src/modules/events/events.router.js
const router = require("express").Router();
const controller = require("./events.controller");
const verifyJwt = require("../../middleware/verifyJwt");

// All events routes require authentication
router.use(verifyJwt);

/**
 * GET /api/events/people
 * Get people events (birthdays, anniversaries, new joiners)
 * Query params: scope (organization, team, etc.)
 * Accessible: All authenticated users
 */
router.get("/people", controller.getPeopleEvents);

module.exports = router;
