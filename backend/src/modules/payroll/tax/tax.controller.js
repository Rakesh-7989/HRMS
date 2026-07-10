const taxService = require('./tax.service');
const form16Service = require('./form16.service');

// Sections
const getTaxSections = async (req, res) => {
    try {
        const sections = await taxService.getTaxSections(req.user.tenantId);
        res.json({ status: 'success', data: sections });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

const createTaxSection = async (req, res) => {
    try {
        const section = await taxService.createTaxSection(req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: 'success', data: section });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Regime
const getRegime = async (req, res) => {
    try {
        const { fy } = req.query;
        if (!fy) return res.status(400).json({ status: 'error', message: 'Financial Year (fy) is required' });

        const regime = await taxService.getRegime(req.user.tenantId, req.user.employeeId, fy);
        res.json({ status: 'success', data: regime });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

const setRegime = async (req, res) => {
    try {
        const { fy, regime } = req.body;
        const result = await taxService.setRegime(req.user.tenantId, req.user.employeeId, fy, regime);
        res.json({ status: 'success', data: result });
    } catch (err) {
        console.error('[setRegime] Error:', err);
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// Declarations
const getDeclarations = async (req, res) => {
    try {
        const { fy } = req.query;
        if (!fy) return res.status(400).json({ status: 'error', message: 'Financial Year (fy) is required' });

        const declarations = await taxService.getDeclarations(req.user.tenantId, req.user.employeeId, fy);
        res.json({ status: 'success', data: declarations });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

const upsertDeclaration = async (req, res) => {
    try {
        const result = await taxService.upsertDeclaration(req.user.tenantId, req.user.employeeId, req.user.id, req.body);
        res.json({ status: 'success', data: result });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

const deleteDeclaration = async (req, res) => {
    try {
        await taxService.deleteDeclaration(req.user.tenantId, req.params.id, req.user.employeeId);
        res.json({ status: 'success', message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Admin Review
const getAdminReviewList = async (req, res) => {
    try {
        const { fy, status } = req.query;
        if (!fy) return res.status(400).json({ status: 'error', message: 'Financial Year (fy) is required' });

        const list = await taxService.getAdminReviewList(req.user.tenantId, fy, status);
        res.json({ status: 'success', data: list });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

const adminReviewDeclaration = async (req, res) => {
    try {
        const result = await taxService.adminReviewDeclaration(req.user.tenantId, req.params.id, req.user.id, req.body);
        res.json({ status: 'success', data: result });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// Form 16
const downloadForm16PartB = async (req, res) => {
    try {
        const { fy } = req.query;
        // If admin, allowing specifying employeeId via query, else use self
        const employeeId = (['ADMIN', 'HR'].includes(req.user.role) && req.query.employeeId)
            ? req.query.employeeId
            : req.user.employeeId;

        if (!fy) return res.status(400).json({ status: 'error', message: 'Financial Year (fy) is required' });

        const pdfBuffer = await form16Service.generateForm16PartB(req.user.tenantId, employeeId, fy);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Form16_PartB_${fy}_${employeeId}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Form 16 Error:", err);
        res.status(500).json({
            status: 'error',
            message: err.message || 'Failed to generate Form 16 Part B'
        });
    }
};

module.exports = {
    getTaxSections,
    createTaxSection,
    getRegime,
    setRegime,
    getDeclarations,
    upsertDeclaration,
    deleteDeclaration,
    getAdminReviewList,
    adminReviewDeclaration,
    downloadForm16PartB
};
