const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
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
// GENERATE PAYSLIPS
// =====================

// Generate payslips for a month (creates and calculates a payrun)
router.post(
    "/generate",
    requireAnyPermission(["payroll.manage"]),
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const { month, year } = req.body;

            if (!month || !year) {
                return res.status(400).json({ status: 'error', message: 'Month and year are required' });
            }

            const payrunService = require('../payrun/payrun.service');

            // Create the payrun
            const payrun = await payrunService.createPayrun(tenantId, userId, {
                periodMonth: month,
                periodYear: year
            });

            // Calculate the payrun
            const calculatedPayrun = await payrunService.calculatePayrun(tenantId, payrun.id, userId);

            // Auto-approve the payrun so payslips are immediately available
            const approvedPayrun = await payrunService.approvePayrun(tenantId, payrun.id, userId);

            res.json({ status: 'success', data: approvedPayrun });
        } catch (err) {
            console.error('Payslip generation error:', err);
            res.status(500).json({ status: 'error', message: err.message || 'Failed to generate payslips' });
        }
    }
);

// =====================
// PAYSLIPS
// =====================

// Employee views their payslips
router.get(
    "/my",
    requireAnyPermission(["payroll.view_own"]),
    controller.getMyPayslips
);

// Admin/HR views all payslips
router.get(
    "/",
    requireAnyPermission(["payroll.manage"]),
    controller.getAllPayslips
);

// Get specific payslip data
router.get(
    "/:payrollRunId/employee/:employeeId",
    requireAnyPermission(["payroll.view_own"]),
    controller.getPayslipData
);

// Download payslip PDF
router.get(
    "/:id/download",
    requireAnyPermission(["payroll.view_own"]),
    controller.downloadPayslip
);

// Email payslip as PDF
router.post(
    "/:id/email",
    requirePermission("payroll.manage"),
    controller.emailPayslip
);

// =====================
// TAX DECLARATIONS
// =====================

// Employee views their tax declaration
router.get(
    "/tax-declaration",
    requireAnyPermission(["payroll.view_own"]),
    controller.getMyTaxDeclaration
);

// Employee saves tax declaration
router.put(
    "/tax-declaration",
    requireAnyPermission(["payroll.view_own"]),
    validate(taxDeclarationSchema),
    controller.saveTaxDeclaration
);

// Submit for verification
router.patch(
    "/tax-declaration/:id/submit",
    requireAnyPermission(["payroll.view_own"]),
    controller.submitTaxDeclaration
);

// HR verifies declaration
router.patch(
    "/tax-declaration/:id/verify",
    requireAnyPermission(["payroll.manage"]),
    controller.verifyTaxDeclaration
);

module.exports = router;
