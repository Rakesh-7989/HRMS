const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.applyLeaveSchema = z.object({
    body: z.object({
        leave_type_id: uuidString,
        start_date: dateString,
        end_date: dateString,
        is_half_day: z.boolean().optional(),
        half_day_session: z.enum(["MORNING", "AFTERNOON"]).optional().nullable(),
        reason: z.string().min(5).max(500).optional(),
        attachment_url: z.string().url().optional().nullable()
    })
});

exports.approveLeaveSchema = z.object({
    params: z.object({ id: uuidString }),
    body: z.object({
        comment: z.string().max(500).optional()
    })
});

exports.rejectLeaveSchema = z.object({
    params: z.object({ id: uuidString }),
    body: z.object({
        reason: z.string().min(5).max(500)
    })
});

exports.cancelLeaveSchema = z.object({
    params: z.object({ id: uuidString }),
    body: z.object({
        reason: z.string().max(500).optional()
    })
});
