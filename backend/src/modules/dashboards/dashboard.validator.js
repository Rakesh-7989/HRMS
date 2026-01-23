// src/modules/dashboards/dashboard.validator.js
const { body, query } = require("express-validator");

/**
 * Validator schemas for dashboard endpoints
 * Dashboards generally don't require input validation
 * as they only fetch data with user context
 */

module.exports = {
  // Can be extended in future for filtering/pagination
  // e.g., date ranges, page numbers, etc.
};
