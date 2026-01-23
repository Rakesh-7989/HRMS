const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.adjustBalanceSchema = z.object({
    body: z.object({
        employee_id: uuidString,
        leave_type_id: uuidString,
        adjustment: z.number().min(-365).max(365),
        reason: z.string().min(5).max(500)
    })
});

exports.resetAccrualSchema = z.object({
    params: z.object({ employeeId: uuidString }),
    body: z.object({
        new_start_date: dateString
    })
});

exports.yearQuerySchema = z.object({
    query: z.object({
        year: z.string().regex(/^\d{4}$/).optional()
    })
});
