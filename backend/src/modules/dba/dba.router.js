const express = require('express');
const router = express.Router();
const controller = require('./dba.controller');
const verifyJwt = require('../../middleware/verifyJwt');
const requireRole = require('../../middleware/requireRole');

// Protect all routes with JWT and SUPER_ADMIN role
router.use(verifyJwt, requireRole('SUPER_ADMIN'));

// Get all tables
router.get('/tables', controller.getTables);

// Get data for a specific table
router.get('/tables/:tableName', controller.getTableData);

// Execute arbitrary query
router.post('/query', controller.executeQuery);

// Verify DBA password (can be used with JWT)
router.post('/verify-password', controller.verifyPassword);

module.exports = router;
