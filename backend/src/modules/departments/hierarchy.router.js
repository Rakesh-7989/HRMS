const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../middleware/requirePermission');
const hierarchyService = require('./hierarchy.service');

/**
 * GET /api/hierarchy
 * Get organization hierarchy tree
 * Accessible: Anyone with org_hierarchy.view permission
 */
router.get('/', requirePermission('org_hierarchy.view'), async (req, res, next) => {
    try {
        const tree = await hierarchyService.getHierarchyTree(req.user.tenantId);
        res.json({ status: 'success', data: tree });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/hierarchy/positions/:id
 * Get a single hierarchy position
 */
router.get('/positions/:id', requirePermission('org_hierarchy.view'), async (req, res, next) => {
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

/**
 * POST /api/hierarchy/positions
 * Create a new hierarchy position
 */
router.post('/positions', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
    try {
        const position = await hierarchyService.createPosition(req.user.tenantId, req.body);
        res.status(201).json({ status: 'success', data: position });
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /api/hierarchy/positions/:id
 * Update a hierarchy position
 */
router.put('/positions/:id', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
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

/**
 * DELETE /api/hierarchy/positions/:id
 * Delete a hierarchy position
 */
router.delete('/positions/:id', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
    try {
        await hierarchyService.deletePosition(req.params.id);
        res.json({ status: 'success', message: 'Position deleted successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/hierarchy/positions/:id/assign
 * Assign an employee to a hierarchy position
 */
router.post('/positions/:id/assign', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
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

/**
 * POST /api/hierarchy/positions/:id/unassign
 * Remove an employee from a hierarchy position
 */
router.post('/positions/:id/unassign', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
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

/**
 * POST /api/hierarchy/seed
 * Seed default hierarchy positions for the organization
 * Only works if no positions exist yet
 */
router.post('/seed', requirePermission('org_hierarchy.manage'), async (req, res, next) => {
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
