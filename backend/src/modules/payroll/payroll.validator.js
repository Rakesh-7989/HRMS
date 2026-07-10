const { z } = require("zod");

// ===================================================================
// DANGEROUS FORMULA PATTERNS — reject known injection / runtime hazards
// ===================================================================
const DANGEROUS_FORMULA_PATTERNS = [
    /\beval\b/i,
    /\bFunction\b/i,
    /\brequire\b/i,
    /\bimport\b/i,
    /\bprocess\b/i,
    /\bglobal\b/i,
    /\bwindow\b/i,
    /\/\s*0(?:\b|[^.])/,  // literal division by zero  (e.g. /0, / 0)
];

/**
 * Validate formula strings used in salary structure components.
 * Returns true if safe, throws ZodError-style message otherwise.
 */
const safeFormulaValidator = (formula) => {
    if (!formula || typeof formula !== 'string') return true;
    const trimmed = formula.trim();
    if (trimmed.length === 0) return true;

    for (const pattern of DANGEROUS_FORMULA_PATTERNS) {
        if (pattern.test(trimmed)) {
            return false;
        }
    }
    return true;
};

// ===================================================================
// SCHEMAS
// ===================================================================

const createSalaryComponentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().min(0, "Amount must be non-negative"),
    created_by: z.string().uuid().optional().nullable(),
});

/**
 * Schema for creating/updating salary structure components.
 * Enforces non-negative amounts, percentage bounds, and safe formulas.
 */
const createStructureComponentSchema = z.object({
    component_name: z.string().min(1, "Component name is required"),
    component_code: z.string().min(1, "Component code is required"),
    component_type: z.enum(["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "REIMBURSEMENT"]),
    calculation_type: z.enum(["FIXED", "PERCENTAGE_OF_CTC", "PERCENTAGE_OF_BASIC", "FORMULA", "REMAINING"]),
    fixed_amount: z.number().min(0, "Fixed amount cannot be negative").optional().nullable(),
    percentage: z.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100").optional().nullable(),
    formula: z.string()
        .optional()
        .nullable()
        .refine(
            (val) => !val || safeFormulaValidator(val),
            { message: "Formula contains unsafe patterns (division by zero, eval, etc.)" }
        ),
    min_value: z.number().min(0, "Minimum value cannot be negative").optional().nullable(),
    max_value: z.number().min(0, "Maximum value cannot be negative").optional().nullable(),
    display_order: z.number().int().min(0).optional().default(0),
    is_active: z.boolean().optional().default(true),
}).refine(
    (data) => {
        // max_value must be >= min_value when both present
        if (data.min_value != null && data.max_value != null) {
            return data.max_value >= data.min_value;
        }
        return true;
    },
    { message: "max_value must be greater than or equal to min_value" }
);

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

/**
 * Schema for creating a payrun (prevents bogus period values).
 */
const createPayrunSchema = z.object({
    scheduleId: z.string().uuid().optional().nullable(),
    periodMonth: z.number().int().min(1).max(12),
    periodYear: z.number().int().min(2000).max(2100),
    payDate: z.string().or(z.date()).optional().nullable(),
});

module.exports = {
    createSalaryComponentSchema,
    createStructureComponentSchema,
    createExpenseSchema,
    createLoanSchema,
    createTransactionSchema,
    createPayrunSchema,
    safeFormulaValidator,
};
