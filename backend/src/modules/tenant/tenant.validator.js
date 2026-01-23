const { z } = require("zod");

/**
 * TENANT MODULE VALIDATORS
 * Handles tenant registration and account setup
 */

/**
 * TENANT REGISTRATION VALIDATION
 * Validates new tenant company registration
 */
exports.tenantRegisterSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Tenant name must be at least 2 characters")
      .max(255, "Tenant name must not exceed 255 characters"),
    domain: z
      .string()
      .min(1, "Domain cannot be empty")
      .max(255, "Domain must not exceed 255 characters")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    address: z.string().max(500, "Address must not exceed 500 characters").optional(),
    city: z.string().max(100, "City must not exceed 100 characters").optional(),
    state: z.string().max(100, "State must not exceed 100 characters").optional(),
    country: z.string().max(100, "Country must not exceed 100 characters").optional(),
    zip_code: z.string().max(20, "Zip code must not exceed 20 characters").optional(),
    phone: z
      .string()
      .min(1, "Phone cannot be empty")
      .max(20, "Phone must not exceed 20 characters")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    email: z.string()
      .email("Invalid email format")
      .max(255, "Email must not exceed 255 characters"),
    settings: z.object({}).optional()
  })
});

/**
 * UPDATE TENANT VALIDATION
 * Validates tenant profile updates (for future use)
 */
exports.updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    zip_code: z.string().max(20).optional(),
    phone: z.string().max(20).optional(),
    settings: z.object({}).optional()
  })
});
