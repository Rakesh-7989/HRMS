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

router.use(verifyJwt);

// =====================
// STATUTORY CONFIG
// =====================
router.get(
    "/config",
    requireRole(["ADMIN", "HR"]),
    controller.getStatutoryConfig
);

router.put(
    "/config",
    requireRole(["ADMIN"]),
    validate(upsertStatutorySchema),
    controller.upsertStatutoryConfig
);

// =====================
// PT SLABS
// =====================
router.get(
    "/pt-slabs",
    requireRole(["ADMIN", "HR"]),
    controller.getPTSlabs
);

router.post(
    "/pt-slabs",
    requireRole(["ADMIN"]),
    validate(createPTSlabSchema),
    controller.createPTSlab
);

router.delete(
    "/pt-slabs/:id",
    requireRole(["ADMIN"]),
    controller.deletePTSlab
);

// =====================
// DEDUCTION TYPES
// =====================
router.get(
    "/deduction-types",
    requireRole(["ADMIN", "HR"]),
    controller.getDeductionTypes
);

router.post(
    "/deduction-types",
    requireRole(["ADMIN"]),
    validate(createDeductionTypeSchema),
    controller.createDeductionType
);

router.put(
    "/deduction-types/:id",
    requireRole(["ADMIN"]),
    controller.updateDeductionType
);

// =====================
// EMPLOYEE DEDUCTIONS
// =====================
router.get(
    "/deductions/employee/:employeeId",
    requireRole(["ADMIN", "HR"]),
    controller.getEmployeeDeductions
);

router.post(
    "/deductions",
    requireRole(["ADMIN", "HR"]),
    validate(addEmployeeDeductionSchema),
    controller.addEmployeeDeduction
);

router.delete(
    "/deductions/:id",
    requireRole(["ADMIN", "HR"]),
    controller.removeEmployeeDeduction
);

// =====================
// COST CENTRES
// =====================
router.get(
    "/cost-centres",
    requireRole(["ADMIN", "HR", "MANAGER"]),
    controller.getCostCentres
);

router.post(
    "/cost-centres",
    requireRole(["ADMIN"]),
    validate(createCostCentreSchema),
    controller.createCostCentre
);

router.put(
    "/cost-centres/:id",
    requireRole(["ADMIN"]),
    controller.updateCostCentre
);

router.delete(
    "/cost-centres/:id",
    requireRole(["ADMIN"]),
    controller.deleteCostCentre
);

module.exports = router;
