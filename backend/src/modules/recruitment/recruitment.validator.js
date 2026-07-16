const { z } = require("zod");

const jobTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']);
const candidateSourceEnum = z.enum(['WEBSITE', 'REFERRAL', 'PORTAL', 'AGENCY', 'DIRECT']);
const candidateStatusEnum = z.enum(['NEW', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN']);
const interviewModeEnum = z.enum(['IN_PERSON', 'VIDEO', 'PHONE']);
const interviewStatusEnum = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']);

exports.getJobsSchema = z.object({
    query: z.object({ status: z.string().optional() }).optional()
});

exports.getJobSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.createJobSchema = z.object({
    body: z.object({
        title: z.string().min(1),
        department: z.string().optional(),
        location: z.string().optional(),
        type: jobTypeEnum.optional().default('FULL_TIME'),
        experience_min: z.number().int().min(0).optional(),
        experience_max: z.number().int().min(0).optional(),
        salary_min: z.number().min(0).optional(),
        salary_max: z.number().min(0).optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        openings: z.number().int().min(1).optional().default(1)
    })
});

exports.updateJobSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        title: z.string().min(1).optional(),
        department: z.string().optional(),
        location: z.string().optional(),
        type: jobTypeEnum.optional(),
        experience_min: z.number().int().min(0).optional(),
        experience_max: z.number().int().min(0).optional(),
        salary_min: z.number().min(0).optional(),
        salary_max: z.number().min(0).optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        openings: z.number().int().min(1).optional()
    })
});

exports.publishJobSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.closeJobSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.getCandidatesSchema = z.object({
    query: z.object({ job_id: z.string().uuid().optional() }).optional()
});

exports.getCandidateSchema = z.object({
    params: z.object({ id: z.string().uuid() })
});

exports.addCandidateSchema = z.object({
    body: z.object({
        job_id: z.string().uuid(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        source: candidateSourceEnum.optional().default('WEBSITE'),
        experience_years: z.number().min(0).optional(),
        current_company: z.string().optional(),
        current_designation: z.string().optional(),
        expected_ctc: z.number().min(0).optional(),
        current_ctc: z.number().min(0).optional(),
        notice_period: z.string().optional()
    })
});

exports.updateCandidateStatusSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ status: candidateStatusEnum })
});

exports.getInterviewsSchema = z.object({
    query: z.object({ candidate_id: z.string().uuid().optional() }).optional()
});

exports.scheduleInterviewSchema = z.object({
    body: z.object({
        candidate_id: z.string().uuid(),
        round_name: z.string().optional(),
        interviewer_id: z.string().uuid(),
        scheduled_at: z.string(),
        duration_minutes: z.number().int().min(1).optional().default(60),
        mode: interviewModeEnum.optional().default('VIDEO'),
        status: interviewStatusEnum.optional().default('SCHEDULED')
    })
});

exports.updateInterviewSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        round_name: z.string().optional(),
        interviewer_id: z.string().uuid().optional(),
        scheduled_at: z.string().optional(),
        duration_minutes: z.number().int().min(1).optional(),
        mode: interviewModeEnum.optional(),
        status: interviewStatusEnum.optional()
    })
});

exports.submitFeedbackSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        feedback: z.string().min(1),
        rating: z.number().int().min(1).max(10)
    })
});
