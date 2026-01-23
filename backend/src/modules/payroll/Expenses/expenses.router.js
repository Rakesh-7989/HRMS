const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
const validate = require("../../../middleware/validate");
const requireExpenseApprover = require("../../../middleware/requireExpenseApprover");

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

// Create category → HR, ADMIN only
router.post(
  "/createcategories",
  requireRole(["HR", "ADMIN"]),
  validate(createCategorySchema),
  controller.createCategory
);

// Get categories → EMPLOYEE, MANAGER, HR, ADMIN
router.get(
  "/getcategories",
  requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
  controller.getCategories
);

/* =======================
   EXPENSES
   ======================= */

// Create expense → EMPLOYEE, MANAGER
router.post(
  "/createexpense",
  requireRole(["EMPLOYEE", "MANAGER"]),
  validate(createExpenseSchema),
  controller.createExpense
);

// Get expenses
// EMPLOYEE → own
// MANAGER → team
// HR, ADMIN → all
router.get(
  "/getexpenses",
  requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
  controller.getExpenses
);

// Update expense → HR, ADMIN
router.put(
  "/:updateId",
  requireRole(["HR", "ADMIN"]),
  validate(createExpenseSchema),
  controller.updateExpense
);

// Delete expense (soft delete) → HR, ADMIN
router.delete(
  "/:updateId",
  requireRole(["HR", "ADMIN"]),
  controller.deleteExpense
);

// Approve / Reject expense → MANAGER, HR, ADMIN
router.patch(
  "/:expenseId/approve",
  requireRole(["MANAGER", "HR", "ADMIN"]),
  requireExpenseApprover,
  validate(approveExpenseSchema),
  controller.approveExpense
);

// Toggle payroll inclusion → HR, ADMIN
router.patch(
  "/:expenseId/payroll",
  requireRole(["HR", "ADMIN"]),
  validate(payrollToggleSchema),
  controller.togglePayroll
);

module.exports = router;
