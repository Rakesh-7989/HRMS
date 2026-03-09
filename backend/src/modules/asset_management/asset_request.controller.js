const assetRequestService = require("./asset_request.service");
const logger = require("../../config/logger");

exports.createRequest = async (req, res) => {
    try {
        const { asset_category, priority, reason } = req.body;
        const result = await assetRequestService.createRequest(
            req.user.tenantId,
            req.user.employeeId,
            { asset_category, priority, reason }
        );
        res.status(201).json({ status: "success", data: result });
    } catch (error) {
        logger.error("Error creating asset request", error);
        res.status(error.status || 500).json({ message: error.message });
    }
};

exports.listRequests = async (req, res) => {
    try {
        const result = await assetRequestService.listRequests(
            req.user.tenantId,
            req.query,
            req.user.role,
            req.user.employeeId
        );
        res.json({ status: "success", data: result });
    } catch (error) {
        logger.error("Error listing asset requests", error);
        res.status(error.status || 500).json({ message: error.message });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        const result = await assetRequestService.updateRequestStatus(
            req.user.tenantId,
            id,
            status,
            adminNotes,
            req.user.id
        );
        res.json({ status: "success", data: result });
    } catch (error) {
        logger.error("Error updating asset request status", error);
        res.status(error.status || 500).json({ message: error.message });
    }
};

exports.cancelRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await assetRequestService.cancelRequest(
            req.user.tenantId,
            id,
            req.user.employeeId
        );
        res.json({ status: "success", data: result });
    } catch (error) {
        logger.error("Error cancelling asset request", error);
        res.status(error.status || 500).json({ message: error.message });
    }
};
