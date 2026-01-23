const { z } = require("zod");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.createHolidaySchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        date: dateString,
        is_paid: z.boolean().optional(),
        is_optional: z.boolean().optional()
    })
});

exports.uploadHolidaysSchema = z.object({
    body: z.object({
        holidays: z.array(z.object({
            date: dateString,
            name: z.string().min(1).max(100),
            is_paid: z.boolean().optional(),
            is_optional: z.boolean().optional()
        })).min(1)
    })
});

exports.createRestrictedHolidaySchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        date: dateString,
        description: z.string().max(500).optional(),
        max_claims: z.number().int().min(1).optional().nullable()
    })
});

exports.yearQuerySchema = z.object({
    query: z.object({
        year: z.string().regex(/^\d{4}$/).optional()
    })
});
