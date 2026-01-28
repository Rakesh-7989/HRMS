const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
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
    requireRole(["ADMIN", "HR"]),
    validate(createTemplateSchema),
    controller.createTemplate
);

router.get(
    "/templates",
    requireRole(["ADMIN", "HR", "MANAGER"]),
    controller.getTemplates
);

router.get(
    "/templates/:id",
    requireRole(["ADMIN", "HR"]),
    controller.getTemplateById
);

router.put(
    "/templates/:id",
    requireRole(["ADMIN", "HR"]),
    validate(createTemplateSchema),
    controller.updateTemplate
);

router.delete(
    "/templates/:id",
    requireRole(["ADMIN"]),
    controller.deleteTemplate
);

// =====================
// EMPLOYEE SALARY DETAILS
// =====================
router.post(
    "/assign",
    requireRole(["ADMIN", "HR"]),
    validate(assignSalarySchema),
    controller.assignSalary
);

router.get(
    "/all",
    requireRole(["ADMIN", "HR"]),
    controller.getAllEmployeeSalaries
);

router.get(
    "/employee/:employeeId",
    requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
    controller.getEmployeeSalary
);

router.get(
    "/employee/:employeeId/history",
    requireRole(["ADMIN", "HR"]),
    controller.getEmployeeSalaryHistory
);

// =====================
// SALARY REVISIONS
// =====================
router.post(
    "/revisions",
    requireRole(["ADMIN", "HR"]),
    validate(createRevisionSchema),
    controller.createRevision
);

router.get(
    "/revisions",
    requireRole(["ADMIN", "HR"]),
    controller.getRevisions
);

router.patch(
    "/revisions/:id/approve",
    requireRole(["ADMIN"]),
    validate(approveRevisionSchema),
    controller.approveRevision
);

module.exports = router;
