const express = require('express');
const router = express.Router();
const arrearsController = require('./arrears.controller');
const verifyJwt = require('../../../middleware/verifyJwt');
const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

router.get('/list', requirePermission('payroll', 'manage_salary'), arrearsController.listArrears);
router.get('/pending/:employeeId', arrearsController.getPendingArrears);
router.get('/summary', arrearsController.getSummary);

module.exports = router;
