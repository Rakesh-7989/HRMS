const { z } = require("zod");

exports.getReportsSchema = z.object({
    query: z.object({
        type: z.string().optional()
    }).optional()
});

exports.generateReportSchema = z.object({
    body: z.object({
        type: z.enum(['PF', 'ESI', 'PT', 'LWF', 'FORM_16']),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2020).max(2030)
    })
});

exports.downloadReportSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.getSummarySchema = z.object({
    query: z.object({}).optional()
});

exports.getForm16Schema = z.object({
    params: z.object({ employeeId: z.string().uuid() }),
    query: z.object({
        year: z.string().optional().transform(v => v ? parseInt(v) : new Date().getFullYear())
    })
});
