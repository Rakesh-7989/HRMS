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
    requireAnyPermission(["payroll.manage"]),
    validate(createTemplateSchema),
    controller.createTemplate
);

router.get(
    "/templates",
    requireAnyPermission(["payroll.manage", "payroll.view_own"]),
    controller.getTemplates
);

router.get(
    "/templates/:id",
    requireAnyPermission(["payroll.manage"]),
    controller.getTemplateById
);

router.put(
    "/templates/:id",
    requireAnyPermission(["payroll.manage"]),
    validate(createTemplateSchema),
    controller.updateTemplate
);

router.delete(
    "/templates/:id",
    requirePermission("payroll.manage"),
    controller.deleteTemplate
);

// =====================
// EMPLOYEE SALARY DETAILS
// =====================
router.post(
    "/assign",
    requireAnyPermission(["payroll.manage"]),
    validate(assignSalarySchema),
    controller.assignSalary
);

router.get(
    "/all",
    requireAnyPermission(["payroll.manage"]),
    controller.getAllEmployeeSalaries
);

router.get(
    "/employee/:employeeId",
    requireAnyPermission(["payroll.view_own"]),
    controller.getEmployeeSalary
);

router.get(
    "/employee/:employeeId/history",
    requireAnyPermission(["payroll.manage"]),
    controller.getEmployeeSalaryHistory
);

// =====================
// SALARY REVISIONS
// =====================
router.post(
    "/revisions",
    requireAnyPermission(["payroll.manage"]),
    validate(createRevisionSchema),
    controller.createRevision
);

router.get(
    "/revisions",
    requireAnyPermission(["payroll.manage"]),
    controller.getRevisions
);

router.patch(
    "/revisions/:id/approve",
    requirePermission("payroll.manage"),
    validate(approveRevisionSchema),
    controller.approveRevision
);

module.exports = router;
