
const service = require('./events.service');
const pool = require('../../config/db');

exports.getPeopleEvents = async (req, res) => {
    try {
        const scope = req.query.scope || 'personal'; // personal, hr, etc.
        const events = await service.getPeopleEvents(pool, req.user.tenantId, scope);
        res.json({ status: 'success', data: events });
    } catch (err) {
        console.error('Events error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
