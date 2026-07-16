const arrearsService = require('./arrears.service');

exports.listArrears = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const filters = {
            status: req.query.status,
            employeeId: req.query.employeeId
        };
        const arrears = await arrearsService.listArrears(tenantId, filters);
        res.json({ status: 'success', data: arrears });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[listArrears]', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getPendingArrears = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const employeeId = req.params.employeeId;
        const arrears = await arrearsService.getPendingArrears(tenantId, employeeId);
        res.json({ status: 'success', data: arrears });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[getPendingArrears]', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await require('../../../config/db').query(
            `SELECT 
                COUNT(*) filter (where status = 'PENDING') as pending_count,
                COALESCE(SUM(amount) filter (where status = 'PENDING'), 0) as pending_amount,
                COALESCE(SUM(amount) filter (where status = 'PAID'), 0) as paid_amount
             FROM salary_arrears
             WHERE tenant_id = $1`,
            [tenantId]
        );
        res.json({ status: 'success', data: result.rows[0] });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[getArrearSummary]', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
