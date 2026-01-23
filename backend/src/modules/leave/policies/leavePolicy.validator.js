const { z } = require("zod");
const uuidString = z.string().uuid("Invalid UUID");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

exports.createPolicySchema = z.object({
    body: z.object({
        leave_type_id: uuidString,
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        applicable_roles: z.array(z.string()).optional().nullable(),
        employment_types: z.array(z.string()).optional().nullable(),
        is_probation_eligible: z.boolean().optional(),
        min_tenure_months: z.number().int().min(0).optional(),
        accrual_type: z.enum(["MONTHLY", "YEARLY", "FIXED"]).optional(),
        accrual_rate: z.number().min(0).max(100).optional(),
        max_balance: z.number().min(0).optional().nullable(),
        year_start_month: z.number().int().min(1).max(12).optional(),
        priority: z.number().int().min(1).optional()
    })
});

exports.updatePolicySchema = z.object({
    params: z.object({ id: uuidString }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        applicable_roles: z.array(z.string()).optional().nullable(),
        employment_types: z.array(z.string()).optional().nullable(),
        is_probation_eligible: z.boolean().optional(),
        min_tenure_months: z.number().int().min(0).optional(),
        accrual_type: z.enum(["MONTHLY", "YEARLY", "FIXED"]).optional(),
        accrual_rate: z.number().min(0).max(100).optional(),
        max_balance: z.number().min(0).optional().nullable(),
        year_start_month: z.number().int().min(1).max(12).optional(),
        priority: z.number().int().min(1).optional(),
        is_active: z.boolean().optional()
    })
});

exports.assignPolicySchema = z.object({
    body: z.object({
        employee_id: uuidString,
        leave_type_id: uuidString,
        policy_id: uuidString,
        reason: z.string().max(500).optional(),
        effective_from: dateString.optional(),
        effective_to: dateString.optional().nullable()
    })
});
