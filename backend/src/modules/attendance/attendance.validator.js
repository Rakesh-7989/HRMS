const { z } = require("zod");

// Simple YYYY-MM-DD validation
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Generic positive integer
const intString = z
  .string()
  .regex(/^\d+$/, "Must be a positive integer");

/**
 * CLOCK IN / OUT
 * No body expected.
 */
exports.clockInSchema = z.object({
  body: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    device: z.string().max(50).optional()
  })
});

exports.clockOutSchema = z.object({
  body: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    device: z.string().max(50).optional()
  })
});

/**
 * MY ATTENDANCE QUERY
 */
exports.myAttendanceQuerySchema = z.object({
  query: z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    limit: intString.optional(),
    offset: intString.optional()
  })
});

/**
 * TEAM ATTENDANCE QUERY
 */
exports.teamAttendanceQuerySchema = z.object({
  query: z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    limit: intString.optional(),
    offset: intString.optional()
  })
});

/**
 * ADMIN ATTENDANCE RECORDS QUERY
 */
exports.attendanceRecordsQuerySchema = z.object({
  query: z.object({
    employee_id: z.string().uuid().optional(),
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    status: z.enum(["PRESENT", "HALF_DAY", "ABSENT", "APPROVED", "REJECTED", "PENDING_CHECKOUT"]).optional(),
    limit: intString.optional(),
    offset: intString.optional()
  })
});

/**
 * APPROVE / REJECT BODY
 */
exports.approveAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().max(500).optional()
  })
});

exports.rejectAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().min(5, "Rejection reason must be at least 5 characters")
  })
});

/**
 * CONFIRM CHECKOUT SCHEMA
 */
exports.confirmCheckoutSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(["PRESENT", "HALF_DAY"]),
    reason: z.string().max(500).optional()
  })
});

/**
 * SUMMARY QUERY
 */
exports.summaryQuerySchema = z.object({
  query: z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional()
  })
});

/**
 * PENDING CHECKOUTS QUERY
 */
exports.pendingCheckoutsQuerySchema = z.object({
  query: z.object({
    employee_id: z.string().uuid().optional(),
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    limit: intString.optional(),
    offset: intString.optional()
  })
});

/**
 * AUTO APPROVE PENDING SCHEMA
 */
exports.autoApprovePendingSchema = z.object({
  body: z.object({}).strict()
});

/**
 * ANALYTICS QUERY
 */
exports.analyticsQuerySchema = z.object({
  query: z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional()
  })
});

/**
 * REPORTS QUERY
 */
exports.reportsQuerySchema = z.object({
  query: z.object({
    from_date: dateString.optional(),
    to_date: dateString.optional(),
    report_type: z.enum(["summary", "detailed", "trends", "compliance"]).optional(),
    limit: intString.optional(),
    offset: intString.optional()
  })
});

/**
 * REGULARIZATION SCHEMAS
 */
exports.regularizationRequestSchema = z.object({
  body: z.object({
    date: dateString,
    check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:mm)"),
    check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:mm)").optional(),
    reason: z.string().min(3, "Reason is required"),
  })
});

exports.regularizationReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejection_reason: z.string().optional(),
    check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:mm)").optional(),
    check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:mm)").optional()
  }).refine(data => data.status !== 'REJECTED' || (data.rejection_reason && data.rejection_reason.length > 5), {
    message: "Rejection reason is required and must be at least 5 chars",
    path: ["rejection_reason"]
  })
});

exports.pendingRegularizationQuerySchema = z.object({
  query: z.object({
    limit: intString.optional(),
    offset: intString.optional()
  })
});
