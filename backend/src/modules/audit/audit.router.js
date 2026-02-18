
const express = require('express');
const router = express.Router();
const verifyJwt = require('../../middleware/verifyJwt');
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const controller = require('./audit.controller');

router.use(verifyJwt);

// Only Admins (and Super Admins via bypass) can view audit logs
router.get('/', requireAnyPermission(['admin.view_audit_logs', 'admin.manage_tenant']), controller.getAuditLogs);

module.exports = router;
