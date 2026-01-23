const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.reportQuerySchema = z.object({
    query: z.object({
        from_date: dateString.optional(),
        to_date: dateString.optional(),
        department_id: uuidString.optional()
    })
});
