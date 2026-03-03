const express = require('express');
const router = express.Router();

const verifyJwt = require('../../../middleware/verifyJwt');
const controller = require('./salaryStructure.controller');

const requirePermission = require('../../../middleware/requirePermission');

router.use(verifyJwt);

// =====================================================
// SALARY COMPONENTS
// =====================================================

// List all salary components
router.get(
    '/components',
    requirePermission('payroll', 'manage_salary'),
    controller.listComponents
);

// Create a new salary component
router.post(
    '/components',
    requirePermission('payroll', 'manage_salary'),
    controller.createComponent
);

// Update a salary component
router.put(
    '/components/:id',
    requirePermission('payroll', 'manage_salary'),
    controller.updateComponent
);

// Delete (deactivate) a salary component
router.delete(
    '/components/:id',
    requirePermission('payroll', 'manage_salary'),
    controller.deleteComponent
);

// =====================================================
// SALARY STRUCTURES
// =====================================================

// List all salary structures
router.get(
    '/structures',
    requirePermission('payroll', 'manage_salary'),
    controller.listStructures
);

// Get a specific salary structure with components
router.get(
    '/structures/:id',
    requirePermission('payroll', 'manage_salary'),
    controller.getStructure
);

// Create a new salary structure
router.post(
    '/structures',
    requirePermission('payroll', 'manage_salary'),
    controller.createStructure
);

// Update a salary structure
router.put(
    '/structures/:id',
    requirePermission('payroll', 'manage_salary'),
    controller.updateStructure
);

// Delete a salary structure
router.delete(
    '/structures/:id',
    requirePermission('payroll', 'manage_salary'),
    controller.deleteStructure
);

// Migrate active employees to a specific salary structure
router.post(
    '/structures/:id/migrate',
    requirePermission('payroll', 'manage_salary'),
    controller.migrateStructure
);

// =====================================================
// CTC CALCULATOR
// =====================================================

// Calculate CTC breakdown given a structure and amount
router.post(
    '/calculate-ctc',
    requirePermission('payroll', 'manage_salary'),
    controller.calculateCTC
);

// =====================================================
// EMPLOYEE SALARY
// =====================================================

// Get current salary for an employee
router.get(
    '/employees/:employeeId/salary',
    controller.getEmployeeSalary
);

// Assign/Update salary for an employee
router.post(
    '/employees/:employeeId/salary',
    requirePermission('payroll', 'manage_salary'),
    controller.assignEmployeeSalary
);

// Get salary revision history for an employee
router.get(
    '/employees/:employeeId/salary/history',
    requirePermission('payroll', 'manage_salary'),
    controller.getEmployeeSalaryHistory
);

// =====================================================
// TEMPLATES
// =====================================================

// List available structure templates
router.get(
    '/templates',
    requirePermission('payroll', 'manage_salary'),
    controller.listTemplates
);

// Create structure from template
router.post(
    '/structures/from-template',
    requirePermission('payroll', 'manage_salary'),
    controller.createFromTemplate
);

// =====================================================
// ADMIN: SEED DEFAULT DATA
// =====================================================

// Seed default components, types, and structure for tenant
router.post(
    '/seed-defaults',
    requirePermission('payroll', 'manage_statutory'),
    controller.seedDefaults
);

module.exports = router;
