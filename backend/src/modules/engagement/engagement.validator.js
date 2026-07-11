const { z } = require("zod");

exports.getSurveysSchema = z.object({
    query: z.object({}).optional()
});

exports.createSurveySchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        survey_type: z.enum(['PULSE', 'eNPS', 'CUSTOM']).default('PULSE'),
        questions: z.array(z.object({
            question: z.string().min(1),
            type: z.enum(['RATING', 'TEXT', 'MULTIPLE_CHOICE', 'YES_NO']),
            options: z.array(z.string()).optional(),
            required: z.boolean().default(true)
        })).optional().default([]),
        starts_at: z.string().optional(),
        ends_at: z.string().optional()
    })
});

exports.submitResponseSchema = z.object({
    params: z.object({ surveyId: z.string().uuid() }),
    body: z.object({
        answers: z.array(z.object({
            question_id: z.string(),
            answer: z.union([z.string(), z.number()])
        }))
    })
});

exports.getRecognitionSchema = z.object({
    query: z.object({}).optional()
});

exports.sendRecognitionSchema = z.object({
    body: z.object({
        to_employee_id: z.string().uuid(),
        category: z.enum(['VALUES', 'HELPING', 'INNOVATION', 'LEADERSHIP', 'CUSTOMER', 'TEAMWORK']).default('VALUES'),
        message: z.string().min(1)
    })
});

exports.getCelebrationsSchema = z.object({
    query: z.object({
        month: z.string().optional().transform(v => v ? parseInt(v) : new Date().getMonth() + 1)
    })
});
