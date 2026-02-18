const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
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
    requireAnyPermission(["payroll.view_own"]),
    validate(createReimbursementSchema),
    controller.createReimbursement
);

router.get(
    "/reimbursements/my",
    requireAnyPermission(["payroll.view_own"]),
    controller.getMyReimbursements
);

router.get(
    "/reimbursements",
    requireAnyPermission(["payroll.manage"]),
    controller.getReimbursements
);

router.patch(
    "/reimbursements/:id/approve",
    requireAnyPermission(["payroll.manage", "payroll.view_own"]),
    validate(approveReimbursementSchema),
    controller.approveReimbursement
);

// =====================
// F&F SETTLEMENT
// =====================
router.post(
    "/fnf",
    requireAnyPermission(["payroll.manage"]),
    validate(createFnFSchema),
    controller.createFnFSettlement
);

router.get(
    "/fnf",
    requireAnyPermission(["payroll.manage"]),
    controller.getFnFSettlements
);

router.get(
    "/fnf/:id",
    requireAnyPermission(["payroll.manage"]),
    controller.getFnFSettlementById
);

router.put(
    "/fnf/:id",
    requireAnyPermission(["payroll.manage"]),
    controller.updateFnFSettlement
);

router.patch(
    "/fnf/:id/submit",
    requirePermission("payroll.manage"),
    controller.submitFnFForApproval
);

router.patch(
    "/fnf/:id/approve",
    requirePermission("payroll.manage"),
    validate(approveFnFSchema),
    controller.approveFnFSettlement
);

router.patch(
    "/fnf/:id/pay",
    requirePermission("payroll.manage"),
    controller.markFnFPaid
);

module.exports = router;
