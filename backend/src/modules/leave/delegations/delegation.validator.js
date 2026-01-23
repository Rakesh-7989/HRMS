const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.createDelegationSchema = z.object({
    body: z.object({
        delegate_id: uuidString,
        start_date: dateString,
        end_date: dateString,
        reason: z.string().max(500).optional()
    })
});
