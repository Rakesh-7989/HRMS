const { z } = require("zod");

exports.getInsightsSchema = z.object({
    query: z.object({}).optional()
});

exports.parseResumeSchema = z.object({
    body: z.object({}).optional()
});

exports.analyzeSentimentSchema = z.object({
    params: z.object({ surveyId: z.string().uuid() })
});

exports.getSkillGapsSchema = z.object({
    params: z.object({ employeeId: z.string().uuid() }),
    query: z.object({ role_id: z.string().uuid().optional() }).optional()
});

exports.generateContentSchema = z.object({
    body: z.object({
        prompt: z.string().min(1),
        context: z.string().optional()
    })
});

exports.chatSchema = z.object({
    body: z.object({
        message: z.string().min(1),
        history: z.array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            timestamp: z.string().optional()
        })).optional()
    })
});

exports.matchCandidatesSchema = z.object({
    params: z.object({ jobId: z.string().uuid() })
});
