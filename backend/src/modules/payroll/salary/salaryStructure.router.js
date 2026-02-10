const express = require('express');
const router = express.Router();

const verifyJwt = require('../../../middleware/verifyJwt');
const requireRole = require('../../../middleware/requireRole');
const controller = require('./salaryStructure.controller');

router.use(verifyJwt);

// =====================================================
// SALARY COMPONENTS
// =====================================================

// List all salary components
router.get(
    '/components',
    requireRole(['HR', 'ADMIN']),
    controller.listComponents
);

// Create a new salary component
router.post(
    '/components',
    requireRole(['HR', 'ADMIN']),
    controller.createComponent
);

// Update a salary component
router.put(
    '/components/:id',
    requireRole(['HR', 'ADMIN']),
    controller.updateComponent
);

// Delete (deactivate) a salary component
router.delete(
    '/components/:id',
    requireRole(['HR', 'ADMIN']),
    controller.deleteComponent
);

// =====================================================
// SALARY STRUCTURES
// =====================================================

// List all salary structures
router.get(
    '/structures',
    requireRole(['HR', 'ADMIN']),
    controller.listStructures
);

// Get a specific salary structure with components
router.get(
    '/structures/:id',
    requireRole(['HR', 'ADMIN']),
    controller.getStructure
);

// Create a new salary structure
router.post(
    '/structures',
    requireRole(['HR', 'ADMIN']),
    controller.createStructure
);

// Update a salary structure
router.put(
    '/structures/:id',
    requireRole(['HR', 'ADMIN']),
    controller.updateStructure
);

// Delete a salary structure
router.delete(
    '/structures/:id',
    requireRole(['HR', 'ADMIN']),
    controller.deleteStructure
);

// Migrate active employees to a specific salary structure
router.post(
    '/structures/:id/migrate',
    requireRole(['HR', 'ADMIN']),
    controller.migrateStructure
);

// =====================================================
// CTC CALCULATOR
// =====================================================

// Calculate CTC breakdown given a structure and amount
router.post(
    '/calculate-ctc',
    requireRole(['HR', 'ADMIN']),
    controller.calculateCTC
);

// =====================================================
// EMPLOYEE SALARY
// =====================================================

// Get current salary for an employee
router.get(
    '/employees/:employeeId/salary',
    requireRole(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']),
    controller.getEmployeeSalary
);

// Assign/Update salary for an employee
router.post(
    '/employees/:employeeId/salary',
    requireRole(['HR', 'ADMIN']),
    controller.assignEmployeeSalary
);

// Get salary revision history for an employee
router.get(
    '/employees/:employeeId/salary/history',
    requireRole(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']),
    controller.getEmployeeSalaryHistory
);

// =====================================================
// TEMPLATES
// =====================================================

// List available structure templates
router.get(
    '/templates',
    requireRole(['HR', 'ADMIN']),
    controller.listTemplates
);

// Create structure from template
router.post(
    '/structures/from-template',
    requireRole(['HR', 'ADMIN']),
    controller.createFromTemplate
);

// =====================================================
// ADMIN: SEED DEFAULT DATA
// =====================================================

// Seed default components, types, and structure for tenant
router.post(
    '/seed-defaults',
    requireRole(['HR', 'ADMIN']),
    controller.seedDefaults
);

module.exports = router;
