const { z } = require('zod');

const createSubscriptionSchema = z.object({
    body: z.object({
        tenant_id: z.string().uuid(),
        plan_id: z.string().uuid(),
        billing_cycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
        is_trial: z.boolean().optional().default(false),
        status: z.enum(['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT', 'PAST_DUE', 'SUSPENDED']).optional().default('TRIAL')
    })
});

const upgradeSubscriptionSchema = z.object({
    body: z.object({
        plan_id: z.string().uuid(),
        billing_cycle: z.enum(['MONTHLY', 'YEARLY']).optional()
    })
});

const planSearchSchema = z.object({
    query: z.object({
        is_active: z.string().optional()
    })
});

module.exports = {
    createSubscriptionSchema,
    upgradeSubscriptionSchema,
    planSearchSchema
};
