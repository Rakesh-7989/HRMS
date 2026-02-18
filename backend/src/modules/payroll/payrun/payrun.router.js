const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./payrun.controller");
const { z } = require("zod");

// Validators
const createScheduleSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        cycle: z.enum(["MONTHLY", "BI_WEEKLY", "WEEKLY"]).optional(),
        payDay: z.number().int().min(1).max(31).optional(),
        cutOffDay: z.number().int().min(1).max(31).optional(),
        isDefault: z.boolean().optional()
    })
});

const createPayrunSchema = z.object({
    body: z.object({
        scheduleId: z.string().uuid().optional(),
        periodMonth: z.number().int().min(1).max(12),
        periodYear: z.number().int().min(2020).max(2100),
        payDate: z.string().optional()
    })
});

const rejectPayrunSchema = z.object({
    body: z.object({
        reason: z.string().min(5)
    })
});

router.use(verifyJwt);

// =====================
// PAY SCHEDULES
// =====================
router.post(
    "/schedules",
    requireAnyPermission(["payroll.manage"]),
    validate(createScheduleSchema),
    controller.createSchedule
);

router.get(
    "/schedules",
    requireAnyPermission(["payroll.manage"]),
    controller.getSchedules
);

// =====================
// PAYROLL RUNS
// =====================
router.post(
    "/",
    requireAnyPermission(["payroll.manage"]),
    validate(createPayrunSchema),
    controller.createPayrun
);

router.get(
    "/",
    requireAnyPermission(["payroll.manage", "payroll.view_own"]),
    controller.getPayruns
);

router.get(
    "/:id",
    requireAnyPermission(["payroll.manage", "payroll.view_own"]),
    controller.getPayrunById
);

// Calculate payrun
router.post(
    "/:id/calculate",
    requireAnyPermission(["payroll.manage"]),
    controller.calculatePayrun
);

// Approve payrun
router.patch(
    "/:id/approve",
    requirePermission("payroll.manage"),
    controller.approvePayrun
);

// Reject payrun
router.patch(
    "/:id/reject",
    requirePermission("payroll.manage"),
    validate(rejectPayrunSchema),
    controller.rejectPayrun
);

// Revoke payrun
router.patch(
    "/:id/revoke",
    requirePermission("payroll.manage"),
    controller.revokePayrun
);

// Delete payrun (DRAFT, CALCULATED, PENDING_APPROVAL)
router.delete(
    "/:id",
    requirePermission("payroll.manage"),
    controller.deletePayrun
);

// Void payrun (APPROVED/PAID — keeps data for audit)
router.patch(
    "/:id/void",
    requirePermission("payroll.manage"),
    controller.voidPayrun
);

// Delete a single payslip item from a payrun
router.delete(
    "/:id/items/:itemId",
    requireAnyPermission(["payroll.manage"]),
    controller.deletePayslipItem
);

// Lock payrun
router.patch(
    "/:id/lock",
    requirePermission("payroll.manage"),
    controller.lockPayrun
);

module.exports = router;
