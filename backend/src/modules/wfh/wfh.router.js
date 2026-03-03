const express = require('express');
const router = express.Router();
const wfhController = require('./wfh.controller');
const requirePermission = require('../../middleware/requirePermission');

// All routes are protected by verifyJwt in main router

// Employee routes
router.post('/request', requirePermission('wfh', 'create'), wfhController.requestWFH);
router.get('/my-requests', requirePermission('wfh', 'view'), wfhController.getMyRequests);

// Manager/HR routes
router.get('/pending', requirePermission('wfh', 'approve'), wfhController.getPendingRequests);
router.get('/capacity-stats', requirePermission('wfh', 'view_team_stats'), wfhController.getCapacityStats);
router.put('/:id/approve', requirePermission('wfh', 'approve'), wfhController.approveRequest);
router.put('/:id/reject', requirePermission('wfh', 'approve'), wfhController.rejectRequest);

module.exports = router;
