
const service = require('./audit.service');

exports.getAuditLogs = async (req, res) => {
    try {
        const filters = req.query;
        const logs = await service.getAuditLogs(req.db, filters, req.user);
        res.json({ status: 'success', data: logs });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Audit Log Fetch Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
