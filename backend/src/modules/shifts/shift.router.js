const express = require('express');
const router = express.Router();
const shiftController = require('./shift.controller');
const requireRole = require('../../middleware/requireRole');

// GET methods - Allow Managers and Employees to view shifts
router.get('/', requireRole(['HR', 'ADMIN', 'MANAGER', 'EMPLOYEE']), shiftController.getShifts);
router.get('/:id', requireRole(['HR', 'ADMIN', 'MANAGER', 'EMPLOYEE']), shiftController.getShiftById);

// Only HR and ADMIN can manage (create/update/delete/assign) shifts
router.use(requireRole(['HR', 'ADMIN']));

router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);
router.post('/assign', shiftController.assignShift);

module.exports = router;
