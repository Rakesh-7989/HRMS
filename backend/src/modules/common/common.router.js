const express = require('express');
const router = express.Router();
const commonController = require('./common.controller');

/**
 * Route for getting the exhaustive timezone list via proxy.
 * Publicly accessible (or protected if desired, but frontend needs it early).
 */
router.get('/timezones', commonController.getTimezones);

/**
 * Route for handling "Contact Sales" inquiries from the public website
 */
router.post('/contact-sales', commonController.handleContactSales);

module.exports = router;
