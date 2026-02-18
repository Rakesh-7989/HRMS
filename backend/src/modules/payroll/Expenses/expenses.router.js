const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
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
  requireAnyPermission(["payroll.manage"]),
  validate(createCategorySchema),
  controller.createCategory
);

// Get categories → EMPLOYEE, MANAGER, HR, ADMIN
router.get(
  "/getcategories",
  requireAnyPermission(["payroll.view_own"]),
  controller.getCategories
);

/* =======================
   EXPENSES
   ======================= */

// Create expense → EMPLOYEE, MANAGER
router.post(
  "/createexpense",
  requireAnyPermission(["payroll.view_own"]),
  validate(createExpenseSchema),
  controller.createExpense
);

// Get expenses
// EMPLOYEE → own
// MANAGER → team
// HR, ADMIN → all
router.get(
  "/getexpenses",
  requireAnyPermission(["payroll.view_own"]),
  controller.getExpenses
);

// Update expense → HR, ADMIN
router.put(
  "/:updateId",
  requireAnyPermission(["payroll.manage"]),
  validate(createExpenseSchema),
  controller.updateExpense
);

// Delete expense (soft delete) → HR, ADMIN
router.delete(
  "/:updateId",
  requireAnyPermission(["payroll.manage"]),
  controller.deleteExpense
);

// Approve / Reject expense → MANAGER, HR, ADMIN
router.patch(
  "/:expenseId/approve",
  requireAnyPermission(["payroll.manage", "payroll.view_own"]),
  requireExpenseApprover,
  validate(approveExpenseSchema),
  controller.approveExpense
);

// Toggle payroll inclusion → HR, ADMIN
router.patch(
  "/:expenseId/payroll",
  requireAnyPermission(["payroll.manage"]),
  validate(payrollToggleSchema),
  controller.togglePayroll
);

module.exports = router;
