const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./salary.controller");
const { z } = require("zod");

// Validators
const createTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        code: z.string().optional(),
        description: z.string().optional(),
        basicPercentage: z.number().min(0).max(100).optional(),
        hraPercentage: z.number().min(0).max(100).optional(),
        daPercentage: z.number().min(0).max(100).optional(),
        specialAllowancePercentage: z.number().min(0).max(100).optional(),
        otherAllowancePercentage: z.number().min(0).max(100).optional(),
        isDefault: z.boolean().optional()
    })
});

const assignSalarySchema = z.object({
    body: z.object({
        employeeId: z.string().uuid(),
        templateId: z.string().uuid().optional(),
        ctc: z.coerce.number().positive(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().optional(),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankIfsc: z.string().optional()
    })
});

const createRevisionSchema = z.object({
    body: z.object({
        employeeId: z.string().uuid(),
        newCtc: z.number().positive(),
        oldCtc: z.number().optional(),
        revisionType: z.enum(["APPRAISAL", "PROMOTION", "CORRECTION", "INITIAL"]),
        effectiveFrom: z.string(),
        remarks: z.string().optional()
    })
});

const approveRevisionSchema = z.object({
    body: z.object({
        status: z.enum(["APPROVED", "REJECTED"])
    })
});

router.use(verifyJwt);

// =====================
// SALARY TEMPLATES
// =====================
router.post(
    "/templates",
    requireAnyPermission(["manage_payroll_policies"]),
    validate(createTemplateSchema),
    controller.createTemplate
);

router.get(
    "/templates",
    requireAnyPermission(["manage_payroll_policies", "view_own_payroll"]),
    controller.getTemplates
);

router.get(
    "/templates/:id",
    requireAnyPermission(["manage_payroll_policies"]),
    controller.getTemplateById
);

router.put(
    "/templates/:id",
    requireAnyPermission(["manage_payroll_policies"]),
    validate(createTemplateSchema),
    controller.updateTemplate
);

router.delete(
    "/templates/:id",
    requirePermission("manage_payroll_policies"),
    controller.deleteTemplate
);

// =====================
// EMPLOYEE SALARY DETAILS
// =====================
router.post(
    "/assign",
    requireAnyPermission(["manage_payroll_policies"]),
    validate(assignSalarySchema),
    controller.assignSalary
);

router.get(
    "/all",
    requireAnyPermission(["manage_payroll_policies"]),
    controller.getAllEmployeeSalaries
);

router.get(
    "/employee/:employeeId",
    requireAnyPermission(["view_own_payroll", "view_payroll"]),
    controller.getEmployeeSalary
);

router.get(
    "/employee/:employeeId/history",
    requireAnyPermission(["manage_payroll_policies"]),
    controller.getEmployeeSalaryHistory
);

// =====================
// SALARY REVISIONS
// =====================
router.post(
    "/revisions",
    requireAnyPermission(["manage_payroll_policies"]),
    validate(createRevisionSchema),
    controller.createRevision
);

router.get(
    "/revisions",
    requireAnyPermission(["manage_payroll_policies"]),
    controller.getRevisions
);

router.patch(
    "/revisions/:id/approve",
    requirePermission("manage_payroll_policies"),
    validate(approveRevisionSchema),
    controller.approveRevision
);

module.exports = router;
