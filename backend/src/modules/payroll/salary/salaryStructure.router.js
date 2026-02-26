const express = require('express');
const router = express.Router();

const verifyJwt = require('../../../middleware/verifyJwt');
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const controller = require('./salaryStructure.controller');

router.use(verifyJwt);

// =====================================================
// SALARY COMPONENTS
// =====================================================

// List all salary components
router.get(
    '/components',
    requireAnyPermission(["manage_payroll_components"]),
    controller.listComponents
);

// Create a new salary component
router.post(
    '/components',
    requireAnyPermission(["manage_payroll_components"]),
    controller.createComponent
);

// Update a salary component
router.put(
    '/components/:id',
    requireAnyPermission(["manage_payroll_components"]),
    controller.updateComponent
);

// Delete (deactivate) a salary component
router.delete(
    '/components/:id',
    requireAnyPermission(["manage_payroll_components"]),
    controller.deleteComponent
);

// =====================================================
// SALARY STRUCTURES
// =====================================================

// List all salary structures
router.get(
    '/structures',
    requireAnyPermission(["manage_payroll_components"]),
    controller.listStructures
);

// Get a specific salary structure with components
router.get(
    '/structures/:id',
    requireAnyPermission(["manage_payroll_components"]),
    controller.getStructure
);

// Create a new salary structure
router.post(
    '/structures',
    requireAnyPermission(["manage_payroll_components"]),
    controller.createStructure
);

// Update a salary structure
router.put(
    '/structures/:id',
    requireAnyPermission(["manage_payroll_components"]),
    controller.updateStructure
);

// Delete a salary structure
router.delete(
    '/structures/:id',
    requireAnyPermission(["manage_payroll_components"]),
    controller.deleteStructure
);

// Migrate active employees to a specific salary structure
router.post(
    '/structures/:id/migrate',
    requireAnyPermission(["manage_payroll_components"]),
    controller.migrateStructure
);

// =====================================================
// CTC CALCULATOR
// =====================================================

// Calculate CTC breakdown given a structure and amount
router.post(
    '/calculate-ctc',
    requireAnyPermission(["manage_payroll_components"]),
    controller.calculateCTC
);

// =====================================================
// EMPLOYEE SALARY
// =====================================================

// Get current salary for an employee
router.get(
    '/employees/:employeeId/salary',
    requireAnyPermission(["view_own_payslip"]),
    controller.getEmployeeSalary
);

// Assign/Update salary for an employee
router.post(
    '/employees/:employeeId/salary',
    requireAnyPermission(["manage_payroll_components"]),
    controller.assignEmployeeSalary
);

// Get salary revision history for an employee
router.get(
    '/employees/:employeeId/salary/history',
    requireAnyPermission(["view_own_payslip"]),
    controller.getEmployeeSalaryHistory
);

// =====================================================
// TEMPLATES
// =====================================================

// List available structure templates
router.get(
    '/templates',
    requireAnyPermission(["manage_payroll_components"]),
    controller.listTemplates
);

// Create structure from template
router.post(
    '/structures/from-template',
    requireAnyPermission(["manage_payroll_components"]),
    controller.createFromTemplate
);

// =====================================================
// ADMIN: SEED DEFAULT DATA
// =====================================================

// Seed default components, types, and structure for tenant
router.post(
    '/seed-defaults',
    requireAnyPermission(["manage_payroll_components"]),
    controller.seedDefaults
);

module.exports = router;
