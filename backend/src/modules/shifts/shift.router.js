const express = require('express');
const router = express.Router();
const shiftController = require('./shift.controller');
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

// GET methods - Allow Managers to view shifts
router.get('/', requireAnyPermission(['view_all_employees', 'manage_shifts']), shiftController.getShifts);
router.get('/:id', requireAnyPermission(['view_all_employees', 'manage_shifts']), shiftController.getShiftById);

// Only HR and ADMIN can manage (create/update/delete/assign) shifts
router.use(requireAnyPermission(["manage_shifts"]));

router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);
router.post('/assign', shiftController.assignShift);

module.exports = router;
