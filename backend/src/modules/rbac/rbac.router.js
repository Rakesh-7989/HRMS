const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../middleware/requirePermission');
const permissionService = require('./permission.service');
const roleService = require('./role.service');

// ========================================
// PERMISSIONS
// ========================================

// GET /api/rbac/permissions — list all permissions (grouped by category)
router.get('/permissions', requirePermission('roles.view'), async (req, res, next) => {
    try {
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
        const permissions = await permissionService.getAllPermissions(isSuperAdmin);
        res.json({ status: 'success', data: permissions });
    } catch (err) {
        next(err);
    }
});

// GET /api/rbac/permissions/my — get current user's permissions
router.get('/permissions/my', async (req, res, next) => {
    try {
        const permissions = await permissionService.getUserPermissions(req.user.id);
        res.json({ status: 'success', data: permissions });
    } catch (err) {
        next(err);
    }
});

// ========================================
// ROLES
// ========================================

// GET /api/rbac/roles — list org roles with user/permission counts
router.get('/roles', requirePermission('roles.view'), async (req, res, next) => {
    try {
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
        const roles = await roleService.getOrganizationRoles(req.user.tenantId, isSuperAdmin);
        res.json({ status: 'success', data: roles });
    } catch (err) {
        next(err);
    }
});

// GET /api/rbac/roles/:id — get role detail with permissions
router.get('/roles/:id', requirePermission('roles.view'), async (req, res, next) => {
    try {
        const role = await roleService.getRoleWithPermissions(req.params.id);
        if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });
        res.json({ status: 'success', data: role });
    } catch (err) {
        next(err);
    }
});

// POST /api/rbac/roles — create custom role
router.post('/roles', requirePermission('roles.manage'), async (req, res, next) => {
    try {
        const role = await roleService.createRole(req.user.tenantId, req.body, req.user.id);
        res.status(201).json({ status: 'success', data: role });
    } catch (err) {
        next(err);
    }
});

// PUT /api/rbac/roles/:id — update role
router.put('/roles/:id', requirePermission('roles.manage'), async (req, res, next) => {
    try {
        const role = await roleService.updateRole(req.params.id, req.body);
        res.json({ status: 'success', data: role });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/rbac/roles/:id — delete custom role
router.delete('/roles/:id', requirePermission('roles.manage'), async (req, res, next) => {
    try {
        await roleService.deleteRole(req.params.id);
        res.json({ status: 'success', message: 'Role deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ========================================
// USER-ROLE ASSIGNMENTS
// ========================================

// GET /api/rbac/users/:userId/roles — get user's assigned roles
router.get('/users/:userId/roles', async (req, res, next) => {
    try {
        const roles = await roleService.getUserRoles(req.params.userId);
        res.json({ status: 'success', data: roles });
    } catch (err) {
        next(err);
    }
});

// POST /api/rbac/users/:userId/roles — assign role to user
router.post('/users/:userId/roles', requirePermission('roles.assign'), async (req, res, next) => {
    try {
        const { roleId, scopeType, scopeId } = req.body;
        const assignment = await roleService.assignRoleToUser(
            req.params.userId, roleId, req.user.tenantId, req.user.id, scopeType, scopeId
        );
        res.status(201).json({ status: 'success', data: assignment });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/rbac/users/:userId/roles/:roleId — remove role from user
router.delete('/users/:userId/roles/:roleId', requirePermission('roles.assign'), async (req, res, next) => {
    try {
        await roleService.removeRoleFromUser(req.params.userId, req.params.roleId);
        res.json({ status: 'success', message: 'Role removed successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
