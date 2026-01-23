
const express = require('express');
const router = express.Router();
const verifyJwt = require('../../middleware/verifyJwt');
const requireRole = require('../../middleware/requireRole');
const controller = require('./audit.controller');

router.use(verifyJwt);

// Only Admins (and Super Admins via bypass) can view audit logs
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'HR']), controller.getAuditLogs);

module.exports = router;
