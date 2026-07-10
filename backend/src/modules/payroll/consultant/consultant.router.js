const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requirePermission = require("../../../middleware/requirePermission");
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

// Create consultant
router.post(
    "/",
    requirePermission("payroll", "manage_salary"),
    validate(createConsultantSchema),
    controller.createConsultant
);

// Get all consultants
router.get(
    "/",
    requirePermission("payroll", "view_dashboard"),
    controller.getConsultants
);

// Get consultant by ID
router.get(
    "/:id",
    requirePermission("payroll", "view_dashboard"),
    controller.getConsultantById
);

// Update consultant
router.put(
    "/:id",
    requirePermission("payroll", "manage_salary"),
    controller.updateConsultant
);

// Summary / Payroll Report
router.get(
    "/reports/summary",
    requirePermission("payroll", "view_dashboard"),
    controller.getConsultantPayrollSummary
);

// =====================
// INVOICES
// =====================
router.post(
    "/invoices",
    requirePermission("payroll", "manage_salary"),
    validate(createInvoiceSchema),
    controller.createInvoice
);

router.get(
    "/invoices",
    requirePermission("payroll", "view_dashboard"),
    controller.getInvoices
);

router.patch(
    "/invoices/:id/approve",
    requirePermission("payroll", "manage_salary"),
    controller.approveInvoice
);

router.patch(
    "/invoices/:id/pay",
    requirePermission("payroll", "manage_salary"),
    validate(markPaidSchema),
    controller.markInvoicePaid
);

module.exports = router;
