const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./payslip.controller");
const { z } = require("zod");

// Validators
const taxDeclarationSchema = z.object({
    body: z.object({
        financialYear: z.string(),
        regime: z.enum(["OLD", "NEW"]).optional(),
        section80c: z.number().min(0).max(150000).optional(),
        section80ccc: z.number().min(0).optional(),
        section80ccd1: z.number().min(0).optional(),
        section80ccd1b: z.number().min(0).max(50000).optional(),
        section80ccd2: z.number().min(0).optional(),
        section80d: z.number().min(0).max(100000).optional(),
        section80dd: z.number().min(0).optional(),
        section80ddb: z.number().min(0).optional(),
        section80e: z.number().min(0).optional(),
        section80g: z.number().min(0).optional(),
        section80gg: z.number().min(0).max(60000).optional(),
        section80tta: z.number().min(0).max(10000).optional(),
        section80u: z.number().min(0).optional(),
        hraExemption: z.number().min(0).optional(),
        rentPaidAnnually: z.number().min(0).optional(),
        metroCity: z.boolean().optional(),
        section24: z.number().min(0).max(200000).optional(),
        section80ee: z.number().min(0).max(50000).optional(),
        ltaClaimed: z.number().min(0).optional(),
        otherExemptions: z.number().min(0).optional()
    })
});

router.use(verifyJwt);

// =====================
// PAYSLIPS
// =====================

// Employee views their payslips
router.get(
    "/my",
    requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
    controller.getMyPayslips
);

// Get specific payslip data
router.get(
    "/:payrollRunId/employee/:employeeId",
    requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
    controller.getPayslipData
);

// Download payslip PDF
router.get(
    "/:payrollRunId/employee/:employeeId/download",
    requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
    controller.downloadPayslip
);

// =====================
// TAX DECLARATIONS
// =====================

// Employee views their tax declaration
router.get(
    "/tax-declaration",
    requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
    controller.getMyTaxDeclaration
);

// Employee saves tax declaration
router.put(
    "/tax-declaration",
    requireRole(["EMPLOYEE", "MANAGER"]),
    validate(taxDeclarationSchema),
    controller.saveTaxDeclaration
);

// Submit for verification
router.patch(
    "/tax-declaration/:id/submit",
    requireRole(["EMPLOYEE", "MANAGER"]),
    controller.submitTaxDeclaration
);

// HR verifies declaration
router.patch(
    "/tax-declaration/:id/verify",
    requireRole(["HR", "ADMIN"]),
    controller.verifyTaxDeclaration
);

module.exports = router;
