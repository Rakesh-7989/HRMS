const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");

exports.createLeaveTypeSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        code: z.string().min(2).max(20),
        description: z.string().max(500).optional(),
        is_paid: z.boolean().optional(),
        requires_approval: z.boolean().optional(),
        requires_attachment: z.boolean().optional(),
        min_days_notice: z.number().int().min(0).optional(),
        max_consecutive_days: z.number().int().min(1).optional().nullable()
    })
});

exports.updateLeaveTypeSchema = z.object({
    params: z.object({ id: uuidString }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        is_paid: z.boolean().optional(),
        requires_approval: z.boolean().optional(),
        requires_attachment: z.boolean().optional(),
        min_days_notice: z.number().int().min(0).optional(),
        max_consecutive_days: z.number().int().min(1).optional().nullable(),
        is_active: z.boolean().optional()
    })
});
