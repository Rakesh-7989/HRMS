const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./statutory.controller");
const { z } = require("zod");

// Validators
const upsertStatutorySchema = z.object({
    body: z.object({
        pfEnabled: z.boolean().optional(),
        pfEmployerRate: z.number().min(0).max(100).optional(),
        pfEmployeeRate: z.number().min(0).max(100).optional(),
        pfWageCeiling: z.number().positive().optional(),
        pfAdminCharges: z.number().min(0).optional(),
        pfEstablishmentCode: z.string().optional(),
        esiEnabled: z.boolean().optional(),
        esiEmployerRate: z.number().min(0).max(100).optional(),
        esiEmployeeRate: z.number().min(0).max(100).optional(),
        esiWageCeiling: z.number().positive().optional(),
        esiEstablishmentCode: z.string().optional(),
        ptEnabled: z.boolean().optional(),
        ptState: z.string().optional(),
        lwfEnabled: z.boolean().optional(),
        lwfEmployerAmount: z.number().min(0).optional(),
        lwfEmployeeAmount: z.number().min(0).optional(),
        tdsEnabled: z.boolean().optional()
    })
});

const createPTSlabSchema = z.object({
    body: z.object({
        state: z.string().min(2),
        minSalary: z.number().min(0),
        maxSalary: z.number().optional(),
        monthlyTax: z.number().min(0),
        gender: z.enum(["MALE", "FEMALE", "ALL"]).optional(),
        effectiveFrom: z.string().optional()
    })
});

const createDeductionTypeSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        code: z.string().min(2),
        description: z.string().optional(),
        category: z.enum(["STATUTORY", "LOAN", "PENALTY", "ADVANCE", "OTHER"]),
        isStatutory: z.boolean().optional(),
        isTaxable: z.boolean().optional(),
        isRecurring: z.boolean().optional(),
        calculationType: z.enum(["FIXED", "PERCENTAGE", "SLAB"]).optional(),
        defaultValue: z.number().optional(),
        percentageOf: z.string().optional()
    })
});

const addEmployeeDeductionSchema = z.object({
    body: z.object({
        employeeId: z.string().uuid(),
        deductionTypeId: z.string().uuid(),
        amount: z.number().positive(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().optional(),
        remarks: z.string().optional()
    })
});

const createCostCentreSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        code: z.string().optional(),
        description: z.string().optional(),
        budgetAllocated: z.number().min(0).optional(),
        departmentId: z.string().uuid().optional()
    })
});

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

// =====================
// STATUTORY CONFIG
// =====================
router.get(
    "/config",
    requirePermission("payroll", "manage_statutory"),
    controller.getStatutoryConfig
);

router.put(
    "/config",
    requirePermission("payroll", "manage_statutory"),
    validate(upsertStatutorySchema),
    controller.upsertStatutoryConfig
);

// =====================
// PT SLABS
// =====================
router.get(
    "/pt-slabs",
    requirePermission("payroll", "manage_statutory"),
    controller.getPTSlabs
);

router.post(
    "/pt-slabs",
    requirePermission("payroll", "manage_statutory"),
    validate(createPTSlabSchema),
    controller.createPTSlab
);

router.delete(
    "/pt-slabs/:id",
    requirePermission("payroll", "manage_statutory"),
    controller.deletePTSlab
);

// =====================
// DEDUCTION TYPES
// =====================
router.get(
    "/deduction-types",
    requirePermission("payroll", "manage_statutory"),
    controller.getDeductionTypes
);

router.post(
    "/deduction-types",
    requirePermission("payroll", "manage_statutory"),
    validate(createDeductionTypeSchema),
    controller.createDeductionType
);

router.put(
    "/deduction-types/:id",
    requirePermission("payroll", "manage_statutory"),
    controller.updateDeductionType
);

// =====================
// EMPLOYEE DEDUCTIONS
// =====================
router.get(
    "/deductions/employee/:employeeId",
    requirePermission("payroll", "manage_salary"),
    controller.getEmployeeDeductions
);

router.post(
    "/deductions",
    requirePermission("payroll", "manage_salary"),
    validate(addEmployeeDeductionSchema),
    controller.addEmployeeDeduction
);

router.delete(
    "/deductions/:id",
    requirePermission("payroll", "manage_salary"),
    controller.removeEmployeeDeduction
);

// =====================
// COST CENTRES
// =====================
router.get(
    "/cost-centres",
    requirePermission("payroll", "manage_statutory"),
    controller.getCostCentres
);

router.post(
    "/cost-centres",
    requirePermission("payroll", "manage_statutory"),
    validate(createCostCentreSchema),
    controller.createCostCentre
);

router.put(
    "/cost-centres/:id",
    requirePermission("payroll", "manage_statutory"),
    controller.updateCostCentre
);

router.delete(
    "/cost-centres/:id",
    requirePermission("payroll", "manage_statutory"),
    controller.deleteCostCentre
);

// =====================
// COST CENTRE ALLOCATIONS
// =====================
router.get(
    "/cost-centre-allocations",
    requireRole(["ADMIN", "HR", "MANAGER"]),
    controller.getCostCentreAllocations
);

router.post(
    "/cost-centre-allocations",
    requireRole(["ADMIN"]),
    controller.upsertCostCentreAllocation
);

router.delete(
    "/cost-centre-allocations/:id",
    requireRole(["ADMIN"]),
    controller.deleteCostCentreAllocation
);

module.exports = router;
