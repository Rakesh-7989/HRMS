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
    requireAnyPermission(["run_payroll"]),
    validate(createScheduleSchema),
    controller.createSchedule
);

router.get(
    "/schedules",
    requireAnyPermission(["run_payroll"]),
    controller.getSchedules
);

// =====================
// PAYROLL RUNS
// =====================
router.post(
    "/",
    requireAnyPermission(["run_payroll"]),
    validate(createPayrunSchema),
    controller.createPayrun
);

router.get(
    "/",
    requireAnyPermission(["run_payroll", "view_own_payroll"]),
    controller.getPayruns
);

router.get(
    "/:id",
    requireAnyPermission(["run_payroll", "view_own_payroll"]),
    controller.getPayrunById
);

// Calculate payrun
router.post(
    "/:id/calculate",
    requireAnyPermission(["run_payroll"]),
    controller.calculatePayrun
);

// Approve payrun
router.patch(
    "/:id/approve",
    requirePermission("run_payroll"),
    controller.approvePayrun
);

// Reject payrun
router.patch(
    "/:id/reject",
    requirePermission("run_payroll"),
    validate(rejectPayrunSchema),
    controller.rejectPayrun
);

// Revoke payrun
router.patch(
    "/:id/revoke",
    requirePermission("run_payroll"),
    controller.revokePayrun
);

// Delete payrun (DRAFT, CALCULATED, PENDING_APPROVAL)
router.delete(
    "/:id",
    requirePermission("run_payroll"),
    controller.deletePayrun
);

// Void payrun (APPROVED/PAID — keeps data for audit)
router.patch(
    "/:id/void",
    requirePermission("run_payroll"),
    controller.voidPayrun
);

// Delete a single payslip item from a payrun
router.delete(
    "/:id/items/:itemId",
    requireAnyPermission(["run_payroll"]),
    controller.deletePayslipItem
);

// Lock payrun
router.patch(
    "/:id/lock",
    requirePermission("run_payroll"),
    controller.lockPayrun
);

module.exports = router;
