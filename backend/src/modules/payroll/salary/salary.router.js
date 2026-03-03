const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
// Removed requireRole
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

const requirePermission = require("../../../middleware/requirePermission");

router.use(verifyJwt);

// =====================
// SALARY TEMPLATES
// =====================
router.post(
    "/templates",
    requirePermission("payroll", "manage_salary"),
    validate(createTemplateSchema),
    controller.createTemplate
);

router.get(
    "/templates",
    requirePermission("payroll", "manage_salary"),
    controller.getTemplates
);

router.get(
    "/templates/:id",
    requirePermission("payroll", "manage_salary"),
    controller.getTemplateById
);

router.put(
    "/templates/:id",
    requirePermission("payroll", "manage_salary"),
    validate(createTemplateSchema),
    controller.updateTemplate
);

router.delete(
    "/templates/:id",
    requirePermission("payroll", "manage_salary"),
    controller.deleteTemplate
);

// =====================
// EMPLOYEE SALARY DETAILS
// =====================
router.post(
    "/assign",
    requirePermission("payroll", "manage_salary"),
    validate(assignSalarySchema),
    controller.assignSalary
);

router.get(
    "/all",
    requirePermission("payroll", "manage_salary"),
    controller.getAllEmployeeSalaries
);

router.get(
    "/employee/:employeeId",
    // Individuals can see their own, Managers/Admin/HR need permission
    controller.getEmployeeSalary
);

router.get(
    "/employee/:employeeId/history",
    requirePermission("payroll", "manage_salary"),
    controller.getEmployeeSalaryHistory
);

// =====================
// SALARY REVISIONS
// =====================
router.post(
    "/revisions",
    requirePermission("payroll", "manage_salary"),
    validate(createRevisionSchema),
    controller.createRevision
);

router.get(
    "/revisions",
    requirePermission("payroll", "manage_salary"),
    controller.getRevisions
);

router.patch(
    "/revisions/:id/approve",
    requirePermission("payroll", "approve_payrun"),
    validate(approveRevisionSchema),
    controller.approveRevision
);

module.exports = router;
