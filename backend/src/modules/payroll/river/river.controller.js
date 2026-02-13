const express = require('express');
const router = express.Router();
const riverService = require('./river.service');
const verifyJwt = require('../../../middleware/verifyJwt');

// Dashboard Stats (Enhanced)
router.get('/dashboard', verifyJwt, async (req, res) => {
    try {
        const { month, year } = req.query;
        const result = await riverService.getDashboardStats(req.user.tenantId, month, year);
        res.json(result);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Payroll History (Last 12 months)
router.get('/history', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getPayrollHistory(req.user.tenantId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create/Start Run
router.post('/run', verifyJwt, async (req, res) => {
    try {
        const { month, year } = req.body;
        const result = await riverService.createRun(req.user.tenantId, month, year, req.user.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stage 1: Review
router.get('/review/:runId', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getReviewData(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        console.error('Review data error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/review/:runId/checklist', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.updateChecklist(req.user.tenantId, req.params.runId, req.body.items);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stage 2: Initiate
router.post('/initiate/:runId', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.initiatePayroll(req.user.tenantId, req.params.runId, req.user.id);
        res.json(result);
    } catch (err) {
        console.error('Initiate error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Stage 3: Verify
router.get('/verify/:runId', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getVerificationData(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        console.error('Verify data error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/verify/:runId/approve', verifyJwt, async (req, res) => {
    try {
        const { status, comments } = req.body;
        const result = await riverService.submitApproval(req.user.tenantId, req.params.runId, req.user.id, status, comments);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stage 4: Release
router.post('/release/:runId', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.releasePayroll(req.user.tenantId, req.params.runId, req.user.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Release Summary
router.get('/release/:runId/summary', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getReleaseSummary(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bank File Data
router.get('/release/:runId/bank-file', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getBankFileData(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Salary Register
router.get('/release/:runId/salary-register', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getSalaryRegister(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Audit Log
router.get('/audit/:runId', verifyJwt, async (req, res) => {
    try {
        const result = await riverService.getAuditLog(req.user.tenantId, req.params.runId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
