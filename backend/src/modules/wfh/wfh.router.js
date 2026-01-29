const express = require('express');
const router = express.Router();
const wfhController = require('./wfh.controller');
const verifyJwt = require('../../middleware/verifyJwt');

// All routes are protected by verifyJwt in main router

// Employee routes
router.post('/request', wfhController.requestWFH);
router.get('/my-requests', wfhController.getMyRequests);

// Manager routes
router.get('/pending', wfhController.getPendingRequests);
router.put('/:id/approve', wfhController.approveRequest);
router.put('/:id/reject', wfhController.rejectRequest);

module.exports = router;
