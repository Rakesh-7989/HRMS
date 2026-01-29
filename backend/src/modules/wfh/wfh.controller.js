const wfhService = require('./wfh.service');
const pool = require('../../config/db');

/* ========================== REQUEST WFH ========================== */
exports.requestWFH = async (req, res, next) => {
    try {
        const { request_date, reason } = req.body;

        if (!request_date || !reason) {
            return res.status(400).json({ error: 'Request date and reason are required' });
        }

        const result = await wfhService.requestWFH(pool, {
            request_date,
            reason
        }, req.user);

        res.status(201).json({ data: result });
    } catch (error) {
        if (error.message.includes('already have') || error.message.includes('must have an active employee profile')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

/* ========================== GET MY WFH REQUESTS ========================== */
exports.getMyRequests = async (req, res, next) => {
    try {
        const { status, from_date, to_date } = req.query;

        const requests = await wfhService.getMyWFHRequests(pool, req.user, {
            status,
            from_date,
            to_date
        });

        res.json({ data: requests });
    } catch (error) {
        next(error);
    }
};

/* ========================== GET PENDING REQUESTS (MANAGER) ========================== */
exports.getPendingRequests = async (req, res, next) => {
    try {
        const requests = await wfhService.getPendingWFHRequests(pool, req.user);
        res.json({ data: requests });
    } catch (error) {
        next(error);
    }
};

/* ========================== APPROVE WFH REQUEST ========================== */
exports.approveRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        const result = await wfhService.approveWFH(pool, id, req.user, comment);

        res.json({
            data: result,
            message: 'WFH request approved successfully'
        });
    } catch (error) {
        next(error);
    }
};

/* ========================== REJECT WFH REQUEST ========================== */
exports.rejectRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const result = await wfhService.rejectWFH(pool, id, req.user, reason);

        res.json({
            data: result,
            message: 'WFH request rejected'
        });
    } catch (error) {
        next(error);
    }
};
