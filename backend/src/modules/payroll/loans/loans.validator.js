const { z } = require("zod");

const createLoanSchema = z.object({
  employeeId: z.string().uuid(),
  loanTypeId: z.string().uuid(),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0),
  interestType: z.enum(["FLAT", "REDUCING"]),
  tenureMonths: z.number().int().positive(),
  emiAmount: z.number().positive(),
  totalPayableAmount: z.number().positive(),
  outstandingAmount: z.number().positive(),
  startDate: z.string()
});

const approveLoanSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().optional()
});

const createLoanTypeSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    maxAmount: z.number().positive().optional(),
    maxTenureMonths: z.number().int().positive().optional(),
    interestRate: z.number().min(0).optional(),
    interestType: z.enum(["FLAT", "REDUCING"]).optional(),
    isTaxable: z.boolean().optional(),
    isActive: z.boolean().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const updateLoanTypeSchema = z.object({
  body: createLoanTypeSchema.shape.body.partial(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { 
  createLoanSchema, 
  approveLoanSchema, 
  createLoanTypeSchema,
  updateLoanTypeSchema 
};


