const { z } = require("zod");

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    description: z.string().optional(),
    requiresApproval: z.boolean().optional(),
    approvalThreshold: z.number().optional(),
    isActive: z.boolean().optional()
  })
});

const createExpenseSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid(),
    amount: z.number().positive(),
    expenseDate: z.string(),
    description: z.string().optional(),
    payrollIncluded: z.boolean()
  })
});
const approveExpenseSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"])
  })
});

const payrollToggleSchema = z.object({
  body: z.object({
    payrollIncluded: z.boolean()
  })
});

module.exports = {
  createCategorySchema,
  createExpenseSchema,
  approveExpenseSchema,
  payrollToggleSchema
};
