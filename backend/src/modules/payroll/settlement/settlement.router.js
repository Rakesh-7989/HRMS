const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");

const controller = require("./settlement.controller");
const { z } = require("zod");

// Validators
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
        resignationDate: z.string().optional()
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
    requireRole(["EMPLOYEE", "MANAGER"]),
    validate(createReimbursementSchema),
    controller.createReimbursement
);

router.get(
    "/reimbursements/my",
    requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
    controller.getMyReimbursements
);

router.get(
    "/reimbursements",
    requireRole(["HR", "ADMIN"]),
    controller.getReimbursements
);

router.patch(
    "/reimbursements/:id/approve",
    requireRole(["MANAGER", "HR", "ADMIN"]),
    validate(approveReimbursementSchema),
    controller.approveReimbursement
);

// =====================
// F&F SETTLEMENT
// =====================
router.post(
    "/fnf",
    requireRole(["HR", "ADMIN"]),
    validate(createFnFSchema),
    controller.createFnFSettlement
);

router.get(
    "/fnf",
    requireRole(["HR", "ADMIN"]),
    controller.getFnFSettlements
);

router.get(
    "/fnf/:id",
    requireRole(["HR", "ADMIN"]),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.getFnFSettlementById
);

router.put(
    "/fnf/:id",
    requireRole(["HR", "ADMIN"]),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.updateFnFSettlement
);

router.patch(
    "/fnf/:id/submit",
    requireRole(["HR"]),
    validate(z.object({ params: z.object({ id: z.string().uuid() }) })),
    controller.submitFnFForApproval
);

router.patch(
    "/fnf/:id/approve",
    requireRole(["ADMIN", "HR"]),
    validate(approveFnFSchema),
    controller.approveFnFSettlement
);

router.patch(
    "/fnf/:id/pay",
    requireRole(["ADMIN", "HR"]),
    controller.markFnFPaid
);

module.exports = router;
