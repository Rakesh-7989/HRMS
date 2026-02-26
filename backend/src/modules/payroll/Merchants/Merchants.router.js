const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");
const { requirePermission, requireAnyPermission } = require("../../../middleware/requirePermission");

const controller = require("./Merchants.controller");
const {
  createVendorPaymentSchema,
  createThirdPartyPayoutSchema
} = require("./Merchants.validator");

router.use(verifyJwt);

/* Vendor / Consultant Payments */
router.post(
  "/createvendors",
  requireAnyPermission(["manage_payroll_components"]),
  validate(createVendorPaymentSchema),
  controller.createVendorPayment
);

router.get(
  "/getvendors",
  requireAnyPermission(["manage_payroll_components", "view_own_payslip"]),
  controller.getVendorPayments
);

/* 3rd Party Payroll Payouts */
router.post(
  "/createthird-party",
  requireAnyPermission(["manage_payroll_components"]),
  validate(createThirdPartyPayoutSchema),
  controller.createThirdPartyPayout
);

router.get(
  "/getthird-party",
  requireAnyPermission(["manage_payroll_components"]),
  controller.getThirdPartyPayouts
);

/* Merchant Transactions */
router.get(
  "/transactions",
  requireAnyPermission(["manage_payroll_components", "view_own_payslip"]),
  controller.getMerchantTransactions
);

router.get(
  "/",
  requireAnyPermission(["manage_payroll_components", "view_own_payslip"]),
  controller.getVendorPayments
);

module.exports = router;
