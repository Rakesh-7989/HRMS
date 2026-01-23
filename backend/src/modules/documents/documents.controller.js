const docService = require("./documents.service");

exports.getDocuments = async (req, res) => {
    try {
        const docs = await docService.getDocuments(req.db, req.params.employeeId, req.user.tenantId);
        res.json({ status: "success", documents: docs });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        const doc = await docService.uploadDocument(req.db, { ...req.body, employee_id: req.params.employeeId }, req.user);
        res.status(201).json({ status: "success", document: doc });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        await docService.deleteDocument(req.db, req.params.id, req.user.tenantId);
        res.json({ status: "success", message: "Document deleted" });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};
