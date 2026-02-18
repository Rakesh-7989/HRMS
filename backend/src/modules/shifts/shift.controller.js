const shiftService = require('./shift.service');

exports.createShift = async (req, res, next) => {
    try {
        const shift = await shiftService.createShift(req.db, req.user.tenantId, req.body, req.user.id);
        res.status(201).json({ status: 'success', data: shift });
    } catch (error) {
        if (error.message && error.message.includes('already exists')) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        next(error);
    }
};

exports.getShifts = async (req, res, next) => {
    try {
        const shifts = await shiftService.getShifts(req.db, req.user.tenantId);
        res.json({ status: 'success', data: shifts });
    } catch (error) {
        next(error);
    }
};

exports.getShiftById = async (req, res, next) => {
    try {
        const shift = await shiftService.getShiftById(req.db, req.user.tenantId, req.params.id);
        if (!shift) return res.status(404).json({ status: 'error', message: 'Shift not found' });
        res.json({ status: 'success', data: shift });
    } catch (error) {
        next(error);
    }
};

exports.updateShift = async (req, res, next) => {
    try {
        const shift = await shiftService.updateShift(req.db, req.user.tenantId, req.params.id, req.body, req.user.id);
        if (!shift) return res.status(404).json({ status: 'error', message: 'Shift not found' });
        res.json({ status: 'success', data: shift });
    } catch (error) {
        if (error.message && error.message.includes('already exists')) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        next(error);
    }
};

exports.deleteShift = async (req, res, next) => {
    try {
        const result = await shiftService.deleteShift(req.db, req.user.tenantId, req.params.id);
        if (!result) return res.status(404).json({ status: 'error', message: 'Shift not found' });
        res.json({ status: 'success', message: 'Shift deleted successfully' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete this shift as it is currently assigned to one or more employees.'
            });
        }
        next(error);
    }
};

exports.assignShift = async (req, res, next) => {
    try {
        const { shiftId, employeeIds, assignToAll } = req.body;

        if (!shiftId) {
            return res.status(400).json({ status: 'error', message: 'Shift ID is required' });
        }

        const result = await shiftService.assignShiftToEmployees(
            req.db,
            req.user.tenantId,
            shiftId,
            employeeIds,
            assignToAll
        );

        res.json({
            status: 'success',
            message: 'Shift assigned successfully',
            data: { updatedCount: result.count }
        });
    } catch (error) {
        next(error);
    }
};
