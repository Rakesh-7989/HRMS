const { z } = require("zod");

const bonusTypeEnum = z.enum(['PERFORMANCE', 'DIWALI', 'ANNUAL', 'SALES_COMMISSION', 'SPOT', 'OTHER']);
const frequencyEnum = z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL']);
const calcMethodEnum = z.enum(['FIXED', 'PERCENTAGE_OF_CTC', 'PERCENTAGE_OF_SALES', 'PERCENTAGE_OF_SALARY']);
const commissionTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);
const applicableToEnum = z.enum(['SALES', 'COLLECTION', 'REFERRAL', 'OTHER']);
const commissionFrequencyEnum = z.enum(['PER_TRANSACTION', 'MONTHLY', 'QUARTERLY']);

exports.getPlansSchema = z.object({
    query: z.object({}).optional()
});

exports.createPlanSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        type: bonusTypeEnum.optional().default('PERFORMANCE'),
        frequency: frequencyEnum.optional().default('ANNUAL'),
        eligibility_criteria: z.string().optional(),
        calculation_method: calcMethodEnum.optional().default('FIXED'),
        calculation_value: z.number().min(0),
        max_amount: z.number().min(0).optional()
    })
});

exports.updatePlanSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        name: z.string().min(1).optional(),
        type: bonusTypeEnum.optional(),
        frequency: frequencyEnum.optional(),
        eligibility_criteria: z.string().optional(),
        calculation_method: calcMethodEnum.optional(),
        calculation_value: z.number().min(0).optional(),
        max_amount: z.number().min(0).optional(),
        is_active: z.boolean().optional()
    })
});

exports.getEmployeeBonusesSchema = z.object({
    query: z.object({
        status: z.string().optional()
    }).optional()
});

exports.createEmployeeBonusSchema = z.object({
    body: z.object({
        employee_id: z.string().uuid(),
        bonus_plan_id: z.string().uuid(),
        amount: z.number().min(0),
        payout_month: z.number().int().min(1).max(12),
        payout_year: z.number().int().min(2020).max(2030),
        remarks: z.string().optional()
    })
});

exports.approveBonusSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.payBonusSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.getCommissionsSchema = z.object({
    query: z.object({}).optional()
});

exports.createCommissionSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        applicable_to: applicableToEnum,
        calculation_type: commissionTypeEnum.optional().default('PERCENTAGE'),
        value: z.number().min(0),
        threshold: z.number().min(0).optional(),
        frequency: commissionFrequencyEnum.optional().default('PER_TRANSACTION'),
        is_active: z.boolean().optional().default(true)
    })
});

exports.updateCommissionSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        name: z.string().min(1).optional(),
        applicable_to: applicableToEnum.optional(),
        calculation_type: commissionTypeEnum.optional(),
        value: z.number().min(0).optional(),
        threshold: z.number().min(0).optional(),
        frequency: commissionFrequencyEnum.optional(),
        is_active: z.boolean().optional()
    })
});
