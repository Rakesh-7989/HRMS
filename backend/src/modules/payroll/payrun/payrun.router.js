const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
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
    requireRole(["ADMIN", "HR"]),
    validate(createScheduleSchema),
    controller.createSchedule
);

router.get(
    "/schedules",
    requireRole(["ADMIN", "HR"]),
    controller.getSchedules
);

// =====================
// PAYROLL RUNS
// =====================
router.post(
    "/",
    requireRole(["ADMIN", "HR"]),
    validate(createPayrunSchema),
    controller.createPayrun
);

router.get(
    "/",
    requireRole(["ADMIN", "HR", "MANAGER"]),
    controller.getPayruns
);

router.get(
    "/:id",
    requireRole(["ADMIN", "HR", "MANAGER"]),
    controller.getPayrunById
);

// Calculate payrun
router.post(
    "/:id/calculate",
    requireRole(["ADMIN", "HR"]),
    controller.calculatePayrun
);

// Approve payrun
router.patch(
    "/:id/approve",
    requireRole(["ADMIN"]),
    controller.approvePayrun
);

// Reject payrun
router.patch(
    "/:id/reject",
    requireRole(["ADMIN"]),
    validate(rejectPayrunSchema),
    controller.rejectPayrun
);

// Revoke payrun
router.patch(
    "/:id/revoke",
    requireRole(["ADMIN"]),
    controller.revokePayrun
);

// Delete payrun (only DRAFT)
router.delete(
    "/:id",
    requireRole(["ADMIN"]),
    controller.deletePayrun
);

// Lock payrun
router.patch(
    "/:id/lock",
    requireRole(["ADMIN"]),
    controller.lockPayrun
);

module.exports = router;
