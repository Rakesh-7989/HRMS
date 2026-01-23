const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
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
    requireRole(["HR", "ADMIN"]),
    validate(createConsultantSchema),
    controller.createConsultant
);

router.get(
    "/",
    requireRole(["HR", "ADMIN"]),
    controller.getConsultants
);

router.get(
    "/summary",
    requireRole(["HR", "ADMIN"]),
    controller.getConsultantPayrollSummary
);

router.get(
    "/:id",
    requireRole(["HR", "ADMIN"]),
    controller.getConsultantById
);

router.put(
    "/:id",
    requireRole(["HR", "ADMIN"]),
    validate(createConsultantSchema),
    controller.updateConsultant
);

// =====================
// INVOICES
// =====================
router.post(
    "/invoices",
    requireRole(["HR", "ADMIN"]),
    validate(createInvoiceSchema),
    controller.createInvoice
);

router.get(
    "/invoices/all",
    requireRole(["HR", "ADMIN"]),
    controller.getInvoices
);

router.patch(
    "/invoices/:id/approve",
    requireRole(["ADMIN"]),
    controller.approveInvoice
);

router.patch(
    "/invoices/:id/pay",
    requireRole(["ADMIN"]),
    validate(markPaidSchema),
    controller.markInvoicePaid
);

module.exports = router;
