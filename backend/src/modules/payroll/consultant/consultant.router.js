const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./consultant.controller");
const { z } = require("zod");

// Validators
const createConsultantSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        pan: z.string().optional(),
        gstNumber: z.string().optional(),
        companyName: z.string().optional(),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankIfsc: z.string().optional(),
        contractStart: z.string().optional(),
        contractEnd: z.string().optional(),
        monthlyRate: z.number().positive().optional(),
        hourlyRate: z.number().positive().optional(),
        tdsRate: z.number().min(0).max(100).optional()
    })
});

const createInvoiceSchema = z.object({
    body: z.object({
        consultantId: z.string().uuid(),
        invoiceNumber: z.string().min(1),
        invoiceDate: z.string(),
        amount: z.number().positive(),
        gstAmount: z.number().min(0).optional(),
        description: z.string().optional()
    })
});

const markPaidSchema = z.object({
    body: z.object({
        paymentReference: z.string().optional()
    })
});

router.use(verifyJwt);

// =====================
// CONSULTANTS
// =====================
router.post(
    "/",
    requireAnyPermission(["payroll.manage"]),
    validate(createConsultantSchema),
    controller.createConsultant
);

router.get(
    "/",
    requireAnyPermission(["payroll.manage"]),
    controller.getConsultants
);

router.get(
    "/summary",
    requireAnyPermission(["payroll.manage"]),
    controller.getConsultantPayrollSummary
);

router.get(
    "/:id",
    requireAnyPermission(["payroll.manage"]),
    controller.getConsultantById
);

router.put(
    "/:id",
    requireAnyPermission(["payroll.manage"]),
    validate(createConsultantSchema),
    controller.updateConsultant
);

// =====================
// INVOICES
// =====================
router.post(
    "/invoices",
    requireAnyPermission(["payroll.manage"]),
    validate(createInvoiceSchema),
    controller.createInvoice
);

router.get(
    "/invoices/all",
    requireAnyPermission(["payroll.manage"]),
    controller.getInvoices
);

router.patch(
    "/invoices/:id/approve",
    requirePermission("payroll.manage"),
    controller.approveInvoice
);

router.patch(
    "/invoices/:id/pay",
    requirePermission("payroll.manage"),
    validate(markPaidSchema),
    controller.markInvoicePaid
);

module.exports = router;
