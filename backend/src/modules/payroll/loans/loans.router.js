const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const requireRole = require("../../../middleware/requireRole");
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
  requireRole(["HR", "ADMIN"]),
  validate(createLoanTypeSchema),
  loanController.createLoanType
);

// Get loan types (HR / ADMIN only)
router.get(
  "/loantype",
  requireRole(["HR", "ADMIN"]),
  loanController.getLoanTypes
);

// Get loan type by ID
router.get(
  "/loantype/:loantypeid",
  requireRole(["HR", "ADMIN"]),
  loanController.getLoanTypeById
);

// Update loan type
router.put(
  "/loantype/:loantypeid",
  requireRole(["HR", "ADMIN"]),
  validate(updateLoanTypeSchema),
  loanController.updateLoanType
);

// Delete loan type
router.delete(
  "/loantype/:loantypeid",
  requireRole(["ADMIN"]),
  loanController.deleteLoanType
);

/* ============================
   LOANS
============================ */

// Employee applies for loan
router.post(
  "/",
  // allow employees and HR/ADMIN to create loans (UI allows Admin to add loans)
  requireRole(["EMPLOYEE", "HR", "ADMIN"]),
  loanController.createLoan
);

// Employee: view own loans
router.get(
  "/getloans",
  requireRole(["EMPLOYEE"]),
  loanController.getLoans
);

// Manager: view team loans
router.get(
  "/team",
  requireRole(["MANAGER"]),
  loanController.getLoans
);

// HR / ADMIN: view all loans
router.get(
  "/all",
  requireRole(["HR", "ADMIN"]),
  loanController.getLoanTypes
);

// Get loan by ID (role-aware inside controller)
router.get(
  "/:loanId",
  requireRole(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]),
  loanController.getLoanById
);

// Approve loan
router.patch(
  "/:loanId/approve",
  requireRole(["MANAGER", "HR"]),
  loanController.approveLoan
);

// Close loan
router.patch(
  "/:loanId/close",
  requireRole(["HR", "ADMIN"]),
  loanController.closeLoan
);

module.exports = router;
