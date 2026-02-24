const express = require('express');
const router = express.Router();
const commonController = require('./common.controller');
const verifyJwt = require('../../middleware/verifyJwt');

/**
 * Route for getting the exhaustive timezone list via proxy.
 * Publicly accessible (or protected if desired, but frontend needs it early).
 */
router.get('/timezones', commonController.getTimezones);

module.exports = router;
