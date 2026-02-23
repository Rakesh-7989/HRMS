const express = require('express');
const router = express.Router();
const arrearsController = require('./arrears.controller');
const verifyJwt = require('../../../middleware/verifyJwt');
const requireRole = require('../../../middleware/requireRole');

router.use(verifyJwt);

router.get('/list', requireRole(['ADMIN', 'HR']), arrearsController.listArrears);
router.get('/summary', requireRole(['ADMIN', 'HR']), arrearsController.getSummary);
router.get('/pending/:employeeId', arrearsController.getPendingArrears);

module.exports = router;
