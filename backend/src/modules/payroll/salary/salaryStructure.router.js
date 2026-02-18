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
    requireAnyPermission(["payroll.manage"]),
    controller.listComponents
);

// Create a new salary component
router.post(
    '/components',
    requireAnyPermission(["payroll.manage"]),
    controller.createComponent
);

// Update a salary component
router.put(
    '/components/:id',
    requireAnyPermission(["payroll.manage"]),
    controller.updateComponent
);

// Delete (deactivate) a salary component
router.delete(
    '/components/:id',
    requireAnyPermission(["payroll.manage"]),
    controller.deleteComponent
);

// =====================================================
// SALARY STRUCTURES
// =====================================================

// List all salary structures
router.get(
    '/structures',
    requireAnyPermission(["payroll.manage"]),
    controller.listStructures
);

// Get a specific salary structure with components
router.get(
    '/structures/:id',
    requireAnyPermission(["payroll.manage"]),
    controller.getStructure
);

// Create a new salary structure
router.post(
    '/structures',
    requireAnyPermission(["payroll.manage"]),
    controller.createStructure
);

// Update a salary structure
router.put(
    '/structures/:id',
    requireAnyPermission(["payroll.manage"]),
    controller.updateStructure
);

// Delete a salary structure
router.delete(
    '/structures/:id',
    requireAnyPermission(["payroll.manage"]),
    controller.deleteStructure
);

// Migrate active employees to a specific salary structure
router.post(
    '/structures/:id/migrate',
    requireAnyPermission(["payroll.manage"]),
    controller.migrateStructure
);

// =====================================================
// CTC CALCULATOR
// =====================================================

// Calculate CTC breakdown given a structure and amount
router.post(
    '/calculate-ctc',
    requireAnyPermission(["payroll.manage"]),
    controller.calculateCTC
);

// =====================================================
// EMPLOYEE SALARY
// =====================================================

// Get current salary for an employee
router.get(
    '/employees/:employeeId/salary',
    requireAnyPermission(["payroll.view_own"]),
    controller.getEmployeeSalary
);

// Assign/Update salary for an employee
router.post(
    '/employees/:employeeId/salary',
    requireAnyPermission(["payroll.manage"]),
    controller.assignEmployeeSalary
);

// Get salary revision history for an employee
router.get(
    '/employees/:employeeId/salary/history',
    requireAnyPermission(["payroll.view_own"]),
    controller.getEmployeeSalaryHistory
);

// =====================================================
// TEMPLATES
// =====================================================

// List available structure templates
router.get(
    '/templates',
    requireAnyPermission(["payroll.manage"]),
    controller.listTemplates
);

// Create structure from template
router.post(
    '/structures/from-template',
    requireAnyPermission(["payroll.manage"]),
    controller.createFromTemplate
);

// =====================================================
// ADMIN: SEED DEFAULT DATA
// =====================================================

// Seed default components, types, and structure for tenant
router.post(
    '/seed-defaults',
    requireAnyPermission(["payroll.manage"]),
    controller.seedDefaults
);

module.exports = router;
