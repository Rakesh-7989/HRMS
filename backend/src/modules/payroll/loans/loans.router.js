const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const loanController = require("./loans.controller");
const {
  createLoanTypeSchema,
  updateLoanTypeSchema
} = require("./loans.validator");
// controller methods are available via loanController

router.use(verifyJwt);

/* ============================
   LOAN TYPES (HR / ADMIN)
============================ */

// Create loan type
router.post(
  "/loantype",
  requireAnyPermission(["manage_payroll_components", "manage_loans"]),
  validate(createLoanTypeSchema),
  loanController.createLoanType
);

// Get loan types
router.get(
  "/loantype",
  requireAnyPermission(["manage_payroll_components", "manage_loans"]),
  loanController.getLoanTypes
);

// Get loan type by ID
router.get(
  "/loantype/:loantypeid",
  requireAnyPermission(["manage_payroll_components", "manage_loans"]),
  loanController.getLoanTypeById
);

// Update loan type
router.put(
  "/loantype/:loantypeid",
  requireAnyPermission(["manage_payroll_components", "manage_loans"]),
  validate(updateLoanTypeSchema),
  loanController.updateLoanType
);

// Delete loan type
router.delete(
  "/loantype/:loantypeid",
  requirePermission("manage_loans"),
  loanController.deleteLoanType
);

/* ============================
   LOANS
============================ */

// Employee applies for loan
router.post(
  "/",
  requireAnyPermission(["request_loan", "manage_loans"]),
  loanController.createLoan
);

// Employee: view own loans
router.get(
  "/getloans",
  requirePermission("view_own_payslip"),
  loanController.getLoans
);

// Manager: view team loans
router.get(
  "/team",
  requirePermission("view_team_payroll"),
  loanController.getLoans
);

// HR / ADMIN: view all loans
router.get(
  "/all",
  requireAnyPermission(["manage_loans", "manage_payroll_components"]),
  loanController.getLoanTypes
);

// Get loan by ID (role-aware inside controller)
router.get(
  "/:loanId",
  requireAnyPermission(["view_own_payslip", "view_team_payroll", "manage_loans"]),
  loanController.getLoanById
);

// Approve loan
router.patch(
  "/:loanId/approve",
  requireAnyPermission(["view_team_payroll", "manage_loans"]),
  loanController.approveLoan
);

// Close loan
router.patch(
  "/:loanId/close",
  requirePermission("manage_loans"),
  loanController.closeLoan
);

module.exports = router;
