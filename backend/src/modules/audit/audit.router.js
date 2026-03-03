
const express = require('express');
const router = express.Router();
const verifyJwt = require('../../middleware/verifyJwt');
const requirePermission = require("../../middleware/requirePermission");
const controller = require('./audit.controller');

router.use(verifyJwt);

// Only Admins (and Super Admins via bypass) can view audit logs
router.get('/', requirePermission('audit_logs', 'view'), controller.getAuditLogs);

module.exports = router;
