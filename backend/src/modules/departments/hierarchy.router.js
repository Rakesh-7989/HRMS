const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../middleware/requirePermission');
const hierarchyService = require('./hierarchy.service');

/**
 * GET /api/hierarchy
 * Get organization hierarchy tree
 * Accessible: Anyone with org_hierarchy.view permission
 */
router.get('/', requirePermission('view_organization_structure'), async (req, res, next) => {
    try {
        const tree = await hierarchyService.getHierarchyTree(req.user.tenantId);
        res.json({ status: 'success', data: tree });
    } catch (err) {
        next(err);
    }
});

router.get('/positions/:id', requirePermission('view_organization_structure'), async (req, res, next) => {
    try {
        const position = await hierarchyService.getPosition(req.params.id);
        if (!position) {
            return res.status(404).json({ status: 'error', message: 'Position not found' });
        }
        res.json({ status: 'success', data: position });
    } catch (err) {
        next(err);
    }
});

router.post('/positions', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        const position = await hierarchyService.createPosition(req.user.tenantId, req.body);
        res.status(201).json({ status: 'success', data: position });
    } catch (err) {
        next(err);
    }
});

router.put('/positions/:id', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        const position = await hierarchyService.updatePosition(req.params.id, req.body);
        if (!position) {
            return res.status(404).json({ status: 'error', message: 'Position not found' });
        }
        res.json({ status: 'success', data: position });
    } catch (err) {
        next(err);
    }
});

router.delete('/positions/:id', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        await hierarchyService.deletePosition(req.params.id);
        res.json({ status: 'success', message: 'Position deleted successfully' });
    } catch (err) {
        next(err);
    }
});

router.post('/positions/:id/assign', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({ status: 'error', message: 'employeeId is required' });
        }
        const result = await hierarchyService.assignEmployeeToPosition(employeeId, req.params.id);
        res.json({ status: 'success', data: result });
    } catch (err) {
        next(err);
    }
});

router.post('/positions/:id/unassign', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({ status: 'error', message: 'employeeId is required' });
        }
        const result = await hierarchyService.removeEmployeeFromPosition(employeeId);
        res.json({ status: 'success', data: result });
    } catch (err) {
        next(err);
    }
});

router.post('/seed', requirePermission('manage_organization'), async (req, res, next) => {
    try {
        // Check if positions already exist
        const existing = await require('../../config/db').query(
            `SELECT COUNT(*)::INTEGER AS cnt FROM hierarchy_positions WHERE tenant_id = $1`,
            [req.user.tenantId]
        );
        if (parseInt(existing.rows[0].cnt) > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Hierarchy positions already exist. Delete existing positions first to re-seed.'
            });
        }

        await hierarchyService.seedDefaultHierarchy(req.user.tenantId);
        const tree = await hierarchyService.getHierarchyTree(req.user.tenantId);
        res.status(201).json({ status: 'success', data: tree });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
