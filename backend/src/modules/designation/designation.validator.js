const { z } = require("zod");

exports.createDesignationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Designation name is required"),
    description: z.string().optional()
  })
});

exports.updateDesignationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional()
  }),
  params: z.object({
    id: z.string().uuid()
  })
});

exports.getDesignationSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional()
  }).optional()
});

exports.deleteDesignationSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});
