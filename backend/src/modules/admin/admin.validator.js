const { z } = require("zod");

/**
 * ADMIN MODULE VALIDATORS
 * All endpoints return dashboard/analytics data
 * No request body validation needed for GET endpoints
 */

// ID parameter validation for future use (if needed)
exports.tenantIdParam = z.object({
  params: z.object({
    id: z.string().uuid("Invalid tenant ID format")
  })
});

// Update Tenant Profile Schema
exports.updateTenantProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    settings: z.object({
      primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format").optional(),
      logo_url: z.string().optional()
    }).optional()
  })
});

// Query parameters for audit logs (optional filtering)
exports.auditLogsQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).optional()
});

// Employee status filter (optional)
exports.employeeStatusSchema = z.object({
  query: z.object({
    status: z.enum(["active", "inactive", "all"]).optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
  }).optional()
});
