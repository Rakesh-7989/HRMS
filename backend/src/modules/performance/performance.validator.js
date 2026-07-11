const { z } = require("zod");

const cycleStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CLOSED']);
const reviewTypeEnum = z.enum(['ANNUAL', 'HALF_YEARLY', 'QUARTERLY', 'MONTHLY']);
const reviewStatusEnum = z.enum(['PENDING', 'SUBMITTED', 'ACKNOWLEDGED']);
const goalCategoryEnum = z.enum(['KPI', 'OKR', 'DEVELOPMENT', 'PROJECT']);
const goalStatusEnum = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED']);
const feedbackStatusEnum = z.enum(['PENDING', 'SUBMITTED']);

exports.getCyclesSchema = z.object({
    query: z.object({}).optional()
});

exports.getCycleSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.createCycleSchema = z.object({
    body: z.object({
        title: z.string().min(1),
        review_type: reviewTypeEnum.optional().default('QUARTERLY'),
        start_date: z.string(),
        end_date: z.string()
    })
});

exports.updateCycleSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        title: z.string().min(1).optional(),
        review_type: reviewTypeEnum.optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        status: cycleStatusEnum.optional()
    })
});

exports.closeCycleSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.getReviewsSchema = z.object({
    query: z.object({ cycle_id: z.string().uuid().optional() }).optional()
});

exports.getMyReviewsSchema = z.object({
    query: z.object({}).optional()
});

exports.submitReviewSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        rating: z.number().min(0).max(10),
        comments: z.string().optional()
    })
});

exports.acknowledgeReviewSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.getGoalsSchema = z.object({
    query: z.object({ employee_id: z.string().uuid().optional() }).optional()
});

exports.getMyGoalsSchema = z.object({
    query: z.object({}).optional()
});

exports.createGoalSchema = z.object({
    body: z.object({
        employee_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        category: goalCategoryEnum.optional().default('KPI'),
        target_value: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional()
    })
});

exports.updateGoalSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: goalCategoryEnum.optional(),
        target_value: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        status: goalStatusEnum.optional()
    })
});

exports.updateGoalProgressSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        current_value: z.number()
    })
});

exports.getFeedbackRequestsSchema = z.object({
    query: z.object({}).optional()
});

exports.getPendingFeedbackSchema = z.object({
    query: z.object({}).optional()
});

exports.requestFeedbackSchema = z.object({
    body: z.object({
        employee_id: z.string().uuid(),
        message: z.string().min(1)
    })
});

exports.submitFeedbackSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        response: z.string().min(1)
    })
});

exports.getTemplatesSchema = z.object({
    query: z.object({}).optional()
});

exports.createTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        sections: z.array(z.object({
            name: z.string(),
            weight: z.number(),
            max_score: z.number()
        })).optional().default([])
    })
});

exports.updateTemplateSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        name: z.string().min(1).optional(),
        sections: z.array(z.object({
            name: z.string(),
            weight: z.number(),
            max_score: z.number()
        })).optional(),
        is_active: z.boolean().optional()
    })
});
