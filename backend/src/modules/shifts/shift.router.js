const express = require('express');
const router = express.Router();
const shiftController = require('./shift.controller');
const requirePermission = require('../../middleware/requirePermission');

// GET methods - Allow viewing shifts based on permission
router.get('/', requirePermission('shifts', 'view'), shiftController.getShifts);
router.get('/:id', requirePermission('shifts', 'view'), shiftController.getShiftById);

// Manage shifts permissions
router.post('/', requirePermission('shifts', 'manage'), shiftController.createShift);
router.put('/:id', requirePermission('shifts', 'manage'), shiftController.updateShift);
router.delete('/:id', requirePermission('shifts', 'manage'), shiftController.deleteShift);
router.post('/assign', requirePermission('shifts', 'assign'), shiftController.assignShift);

module.exports = router;
