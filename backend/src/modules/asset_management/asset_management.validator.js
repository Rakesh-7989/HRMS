const { z } = require("zod");

/**
 * CREATE ASSET VALIDATION
 * HR and ADMIN can create assets
 */
exports.createAssetSchema = z.object({
  body: z.object({
    asset_code: z
      .string()
      .min(3, "Asset code must be at least 3 characters")
      .max(50, "Asset code must not exceed 50 characters"),
    name: z
      .string()
      .min(2, "Asset name must be at least 2 characters")
      .max(255, "Asset name must not exceed 255 characters"),
    category: z
      .string()
      .min(2, "Category must be at least 2 characters")
      .max(100, "Category must not exceed 100 characters"),
    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .optional(),
    purchase_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    purchase_price: z
      .number()
      .positive("Purchase price must be positive")
      .optional(),
    manufacturer: z
      .string()
      .max(100, "Manufacturer must not exceed 100 characters")
      .optional(),
    serial_number: z
      .string()
      .max(100, "Serial number must not exceed 100 characters")
      .optional(),
    warranty_expiry: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    status: z
      .enum(["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED"])
      .default("AVAILABLE")
      .optional(),
    notes: z
      .string()
      .max(500, "Notes must not exceed 500 characters")
      .optional(),
    operating_system: z
      .string()
      .max(255, "Operating system must not exceed 255 characters")
      .optional(),
    processor_cpu: z
      .string()
      .max(255, "Processor must not exceed 255 characters")
      .optional(),
    ram: z
      .string()
      .max(100, "RAM must not exceed 100 characters")
      .optional(),
    storage: z
      .string()
      .max(100, "Storage must not exceed 100 characters")
      .optional(),
    graphics_gpu: z
      .string()
      .max(255, "Graphics/GPU must not exceed 255 characters")
      .optional(),
    display: z
      .string()
      .max(100, "Display must not exceed 100 characters")
      .optional(),
    battery: z
      .string()
      .max(100, "Battery must not exceed 100 characters")
      .optional(),
    model_number: z
      .string()
      .max(100, "Model number must not exceed 100 characters")
      .optional()
  })
});

/**
 * UPDATE ASSET VALIDATION
 * ADMIN can update assets
 */
exports.updateAssetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  }),
  body: z.object({
    asset_code: z
      .string()
      .min(3, "Asset code must be at least 3 characters")
      .max(50, "Asset code must not exceed 50 characters")
      .optional(),
    name: z
      .string()
      .min(2, "Asset name must be at least 2 characters")
      .max(255, "Asset name must not exceed 255 characters")
      .optional(),
    category: z
      .string()
      .min(2, "Category must be at least 2 characters")
      .max(100, "Category must not exceed 100 characters")
      .optional(),
    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .optional(),
    purchase_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    purchase_price: z
      .number()
      .positive("Purchase price must be positive")
      .optional(),
    manufacturer: z
      .string()
      .max(100, "Manufacturer must not exceed 100 characters")
      .optional(),
    serial_number: z
      .string()
      .max(100, "Serial number must not exceed 100 characters")
      .optional(),
    warranty_expiry: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    status: z
      .enum(["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED"])
      .optional(),
    notes: z
      .string()
      .max(500, "Notes must not exceed 500 characters")
      .optional(),
    operating_system: z
      .string()
      .max(255, "Operating system must not exceed 255 characters")
      .optional(),
    processor_cpu: z
      .string()
      .max(255, "Processor must not exceed 255 characters")
      .optional(),
    ram: z
      .string()
      .max(100, "RAM must not exceed 100 characters")
      .optional(),
    storage: z
      .string()
      .max(100, "Storage must not exceed 100 characters")
      .optional(),
    graphics_gpu: z
      .string()
      .max(255, "Graphics/GPU must not exceed 255 characters")
      .optional(),
    display: z
      .string()
      .max(100, "Display must not exceed 100 characters")
      .optional(),
    battery: z
      .string()
      .max(100, "Battery must not exceed 100 characters")
      .optional(),
    model_number: z
      .string()
      .max(100, "Model number must not exceed 100 characters")
      .optional()
  })
});

/**
 * GET ASSET BY ID VALIDATION
 * Verified by middleware
 */
exports.getAssetByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  })
});

/**
 * DELETE/RETIRE ASSET VALIDATION
 * ADMIN can retire assets
 */
exports.deleteAssetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  })
});

/**
 * GET BARCODE VALIDATION
 * Verified by middleware
 */
exports.getBarcodeSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  })
});

/**
 * ASSIGN ASSET VALIDATION
 * HR and ADMIN can assign assets
 */
exports.assignAssetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  }),
  body: z.object({
    employee_id: z.string().uuid("Invalid employee ID"),
    notes: z
      .string()
      .max(500, "Notes must not exceed 500 characters")
      .optional()
  })
});

/**
 * RETURN ASSET VALIDATION
 * HR and ADMIN can return assets
 */
exports.returnAssetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  }),
  body: z.object({
    return_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    condition: z
      .enum(["GOOD", "DAMAGED", "LOST", "WORN"])
      .default("GOOD")
      .optional(),
    notes: z
      .string()
      .max(500, "Notes must not exceed 500 characters")
      .optional()
  })
});

/**
 * GET TRACKING/HISTORY VALIDATION
 * Verified by middleware
 */
exports.getTrackingSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid asset ID")
  })
});

/**
 * LIST ASSETS VALIDATION
 * Query parameters for filtering and pagination
 */
exports.listAssetsSchema = z.object({
  query: z.object({
    status: z
      .enum(["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED"])
      .optional(),
    category: z.string().optional(),
    assigned_to: z.string().uuid("Invalid employee ID").optional(),
    skip: z
      .string()
      .transform(Number)
      .refine(n => n >= 0, "Skip must be non-negative")
      .default("0")
      .optional(),
    limit: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 100, "Limit must be between 1 and 100")
      .default("20")
      .optional()
  })
});

/**
 * CREATE ASSET REQUEST VALIDATION
 */
exports.createAssetRequestSchema = z.object({
  body: z.object({
    asset_name: z
      .string()
      .min(2, "Asset name must be at least 2 characters")
      .max(255, "Asset name must not exceed 255 characters"),
    category: z
      .string()
      .min(2, "Category must be at least 2 characters")
      .max(100, "Category must not exceed 100 characters"),
    priority: z
      .enum(["Low", "Medium", "High"])
      .default("Medium"),
    reason: z
      .string()
      .min(5, "Reason must be at least 5 characters")
      .max(1000, "Reason must not exceed 1000 characters")
  })
});

/**
 * HANDLE ASSET REQUEST VALIDATION
 */
exports.handleAssetRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid request ID")
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    admin_notes: z
      .string()
      .max(500, "Admin notes must not exceed 500 characters")
      .optional()
  })
});
