const leaveBalanceService = require("./leaveBalance.service");

exports.getMyBalances = async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const result = await leaveBalanceService.getEmployeeBalances(
            null, req.user.employeeId, req.user.tenantId, year
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getEmployeeBalances = async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const result = await leaveBalanceService.getEmployeeBalances(
            null, req.params.employeeId, req.user.tenantId, year
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.adjustBalance = async (req, res, next) => {
    try {
        const { employee_id, leave_type_id, adjustment, reason } = req.body;
        const result = await leaveBalanceService.adjustBalance(
            null, employee_id, leave_type_id, adjustment, reason, req.user
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.resetAccrual = async (req, res, next) => {
    try {
        const { new_start_date } = req.body;
        const result = await leaveBalanceService.resetAccrual(
            null, req.params.employeeId, new_start_date, req.user
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getAdjustmentHistory = async (req, res, next) => {
    try {
        const result = await leaveBalanceService.getAdjustmentHistory(
            null, req.params.employeeId, req.user.tenantId, req.query
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.bulkAllocate = async (req, res, next) => {
    try {
        const { leave_type_id, days, employee_ids, reason, year } = req.body;
        const result = await leaveBalanceService.bulkAllocate(
            null, leave_type_id, days, employee_ids, reason, req.user, year
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.bulkResetBalances = async (req, res, next) => {
    try {
        const { leave_type_id, employee_ids, reset_to_zero = true, reason, year } = req.body;
        const result = await leaveBalanceService.bulkResetBalances(
            null, leave_type_id, employee_ids, reset_to_zero, reason, req.user, year
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};
