const { z } = require("zod");

exports.getCalendarSchema = z.object({
    query: z.object({
        month: z.string().optional().transform(v => v ? parseInt(v) : new Date().getMonth() + 1),
        year: z.string().optional().transform(v => v ? parseInt(v) : new Date().getFullYear()),
        state: z.string().optional()
    })
});

exports.companyHolidaySchema = z.object({
    body: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        holiday_name: z.string().min(2).max(255),
        state: z.string().optional()
    })
});

exports.stateHolidaySchema = z.object({
    body: z.object({
        state: z.string().min(2),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        holiday_name: z.string().min(2).max(255)
    })
});
