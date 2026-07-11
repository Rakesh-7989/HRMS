const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requirePermission = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const controller = require("./expenses.controller");
const {
  createCategorySchema,
  createExpenseSchema,
  approveExpenseSchema,
  payrollToggleSchema
} = require("./expenses.validator");

// 🔐 All expense routes require authentication
router.use(verifyJwt);

/* =======================
   EXPENSE CATEGORIES
   ======================= */

// Create category
router.post(
  "/createcategories",
  requirePermission("expenses", "manage_categories"),
  validate(createCategorySchema),
  controller.createCategory
);

// Get categories
router.get(
  "/getcategories",
  requirePermission("expenses", "view"),
  controller.getCategories
);

/* =======================
   EXPENSES
   ======================= */

// Create expense
router.post(
  "/createexpense",
  requirePermission("expenses", "create"),
  validate(createExpenseSchema),
  controller.createExpense
);

// Get expenses
router.get(
  "/getexpenses",
  requirePermission("expenses", "view"),
  controller.getExpenses
);

// Update expense → HR, ADMIN (Can be granularized later if needed, but 'create' or a specialized 'manage' works)
router.put(
  "/:updateId",
  requirePermission("expenses", "manage_categories"),
  validate(createExpenseSchema),
  controller.updateExpense
);

// Delete expense (soft delete)
router.delete(
  "/:updateId",
  requirePermission("expenses", "manage_categories"),
  controller.deleteExpense
);

// Approve / Reject expense
router.patch(
  "/:expenseId/approve",
  requirePermission("expenses", "approve"),
  validate(approveExpenseSchema),
  controller.approveExpense
);

// Toggle payroll inclusion
router.patch(
  "/:expenseId/payroll",
  requirePermission("expenses", "toggle_payroll"),
  validate(payrollToggleSchema),
  controller.togglePayroll
);

module.exports = router;
