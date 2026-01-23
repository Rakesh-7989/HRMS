const { z } = require("zod");

/**
 * SUPER ADMIN MODULE VALIDATORS
 * These routes are protected - SUPER_ADMIN role required
 */

/**
 * TENANT ID PARAMETER VALIDATION
 * Validates UUID format for tenant ID in path params
 */
exports.tenantIdParam = z.object({
  params: z.object({
    id: z.string().uuid("Invalid tenant ID format")
  })
});

/**
 * UPDATE TENANT STATUS VALIDATION
 * Validates activation/deactivation of tenant
 */
exports.updateTenantStatusSchema = z.object({
  body: z.object({
    is_active: z.boolean("is_active must be a boolean")
  })
});

/**
 * TENANTS QUERY VALIDATION
 * Optional filters for listing tenants
 */
exports.tenantsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(["active", "inactive", "all"]).optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
  }).optional()
});
