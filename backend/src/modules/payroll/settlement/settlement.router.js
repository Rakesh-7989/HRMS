const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requirePermission = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./settlement.controller");
const { z } = require("zod");

// Validators (Inlined to avoid missing module errors)
const createReimbursementSchema = z.object({
    body: z.object({
        category: z.enum(["MEDICAL", "TRAVEL", "PHONE", "FOOD", "OTHER"]),
        amount: z.number().positive(),
        claimDate: z.string(),
        description: z.string().optional(),
        isTaxable: z.boolean().optional(),
        receiptUrl: z.string().optional()
    })
});

const approveReimbursementSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        status: z.enum(["APPROVED", "REJECTED"]),
        includeInPayroll: z.boolean().optional()
    })
});

const createFnFSchema = z.object({
    body: z.object({
        employeeId: z.string().uuid(),
        lastWorkingDay: z.string(),
        resignationDate: z.string().optional(),
        remarks: z.string().optional()
    })
});

const approveFnFSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        status: z.enum(["APPROVED", "REJECTED"])
    })
});

router.use(verifyJwt);

// =====================
// REIMBURSEMENTS
// =====================
router.post(
    "/reimbursements",
    validate(createReimbursementSchema),
    controller.createReimbursement
);

router.get(
    "/reimbursements/my",
    controller.getMyReimbursements
);

router.get(
    "/reimbursements",
    requirePermission("payroll", "view_payruns"),
    controller.getReimbursements
);

router.patch(
    "/reimbursements/:id/approve",
    requirePermission("payroll", "approve_payrun"),
    validate(approveReimbursementSchema),
    controller.approveReimbursement
);

// =====================
// F&F SETTLEMENT
// =====================
router.post(
    "/fnf",
    requirePermission("payroll", "manage_payruns"),
    validate(createFnFSchema),
    controller.createFnFSettlement
);

router.get(
    "/fnf",
    requirePermission("payroll", "view_payruns"),
    controller.getFnFSettlements
);

router.get(
    "/fnf/:id",
    requirePermission("payroll", "view_payruns"),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.getFnFSettlementById
);

router.put(
    "/fnf/:id",
    requirePermission("payroll", "manage_payruns"),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.updateFnFSettlement
);

router.patch(
    "/fnf/:id/submit",
    requirePermission("payroll", "manage_payruns"),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.submitFnFForApproval
);

router.patch(
    "/fnf/:id/approve",
    requirePermission("payroll", "approve_payrun"),
    validate(approveFnFSchema),
    controller.approveFnFSettlement
);

router.patch(
    "/fnf/:id/pay",
    requirePermission("payroll", "manage_payruns"),
    controller.markFnFPaid
);

module.exports = router;
