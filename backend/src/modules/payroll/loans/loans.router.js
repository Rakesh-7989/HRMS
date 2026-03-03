const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requirePermission = require("../../../middleware/requirePermission");
const validate = require("../../../middleware/validate");

const loanController = require("./loans.controller");
const {
  createLoanTypeSchema,
  updateLoanTypeSchema
} = require("./loans.validator");

router.use(verifyJwt);

/* ============================
   LOAN TYPES (HR / ADMIN)
============================ */

// Create loan type
router.post(
  "/loantype",
  requirePermission("payroll", "manage_loans"),
  validate(createLoanTypeSchema),
  loanController.createLoanType
);

// Get loan types
router.get(
  "/loantype",
  requirePermission("payroll", "manage_loans"),
  loanController.getLoanTypes
);

// Get loan type by ID
router.get(
  "/loantype/:loantypeid",
  requirePermission("payroll", "manage_loans"),
  loanController.getLoanTypeById
);

// Update loan type
router.put(
  "/loantype/:loantypeid",
  requirePermission("payroll", "manage_loans"),
  validate(updateLoanTypeSchema),
  loanController.updateLoanType
);

// Delete loan type
router.delete(
  "/loantype/:loantypeid",
  requirePermission("payroll", "manage_loans"),
  loanController.deleteLoanType
);

/* ============================
   LOANS
============================ */

// Employee applies for loan
router.post(
  "/",
  loanController.createLoan
);

// Employee: view own loans
router.get(
  "/getloans",
  loanController.getMyLoans
);

// Manager view (Team loans)
router.get(
  "/team",
  requirePermission("payroll", "manage_loans"), // Or a specific manager permission
  loanController.getTeamLoans
);

// HR / ADMIN: view all loans
router.get(
  "/all",
  requirePermission("payroll", "manage_loans"),
  loanController.getAllLoans
);

// Get loan by ID
router.get(
  "/:loanId",
  loanController.getLoanById
);

// Approve loan
router.patch(
  "/:loanId/approve",
  requirePermission("payroll", "manage_loans"),
  loanController.approveLoan
);

// Close loan
router.patch(
  "/:loanId/close",
  requirePermission("payroll", "manage_loans"),
  loanController.closeLoan
);

module.exports = router;
