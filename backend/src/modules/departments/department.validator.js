const { z } = require("zod");

/**
 * DEPARTMENT MODULE VALIDATORS
 * Handles department CRUD operations
 */

exports.createDepartmentSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Department name must be at least 2 characters")
      .max(255, "Department name must not exceed 255 characters")
      .trim(),
    description: z.string()
      .max(1000, "Description must not exceed 1000 characters")
      .optional()
      .or(z.literal("").transform(() => undefined))
  })
});

exports.updateDepartmentSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Department name must be at least 2 characters")
      .max(255, "Department name must not exceed 255 characters")
      .optional(),
    description: z.string()
      .max(1000, "Description must not exceed 1000 characters")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    is_active: z.boolean().optional()
  }),
  params: z.object({
    id: z.string().uuid("Invalid department ID format")
  })
});

exports.deleteDepartmentSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid department ID format")
  })
});

exports.getDepartmentSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(["active", "inactive", "all"]).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional()
  }).optional()
});
