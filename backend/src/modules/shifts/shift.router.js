const express = require('express');
const router = express.Router();
const shiftController = require('./shift.controller');
const requireRole = require('../../middleware/requireRole');

// Only HR and ADMIN can manage shifts
router.use(requireRole(['HR', 'ADMIN']));

router.post('/', shiftController.createShift);
router.get('/', shiftController.getShifts);
router.get('/:id', shiftController.getShiftById);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);
router.post('/assign', shiftController.assignShift);

module.exports = router;
