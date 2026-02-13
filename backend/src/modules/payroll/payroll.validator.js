const { z } = require("zod");

const createSalaryComponentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().min(0, "Amount must be non-negative"),
    created_by: z.string().uuid().optional().nullable(),
});

const createExpenseSchema = z.object({
    category: z.string().min(1, "Category is required"),
    amount: z.number().positive("Amount must be positive"),
    expense_date: z.string().or(z.date()).transform((val) => new Date(val)),
    created_by: z.string().uuid().optional().nullable(),
});

const createLoanSchema = z.object({
    employee_id: z.string().uuid("Invalid Employee ID"),
    employee_name: z.string().optional(),
    amount: z.number().positive("Amount must be positive"),
    outstanding: z.number().min(0).optional(),
    created_by: z.string().uuid().optional().nullable(),
});

const createTransactionSchema = z.object({
    employee_id: z.string().uuid("Invalid Employee ID"),
    type: z.enum(["CREDIT", "DEBIT"], { errorMap: () => ({ message: "Type must be CREDIT or DEBIT" }) }),
    amount: z.number().positive("Amount must be positive"),
    tx_date: z.string().or(z.date()).transform((val) => new Date(val)),
    created_by: z.string().uuid().optional().nullable(),
});

module.exports = {
    createSalaryComponentSchema,
    createExpenseSchema,
    createLoanSchema,
    createTransactionSchema,
};
