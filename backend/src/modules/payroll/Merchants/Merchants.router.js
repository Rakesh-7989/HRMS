const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");
const requirePermission = require("../../../middleware/requirePermission");

const controller = require("./Merchants.controller");
const {
  createVendorPaymentSchema,
  createThirdPartyPayoutSchema
} = require("./Merchants.validator");

router.use(verifyJwt);

// =====================
// MERCHANT TRANSACTIONS
// =====================
router.get(
  "/transactions",
  requirePermission("payroll", "view_dashboard"),
  controller.getMerchantTransactions
);

// =====================
// VENDOR PAYMENTS
// =====================
router.post(
  "/vendor-payments",
  requirePermission("payroll", "manage_statutory"),
  validate(createVendorPaymentSchema),
  controller.createVendorPayment
);

router.get(
  "/vendor-payments",
  requirePermission("payroll", "view_dashboard"),
  controller.getVendorPayments
);

// =====================
// THIRD-PARTY PAYOUTS
// =====================
router.post(
  "/third-party-payouts",
  requirePermission("payroll", "manage_statutory"),
  validate(createThirdPartyPayoutSchema),
  controller.createThirdPartyPayout
);

router.get(
  "/third-party-payouts",
  requirePermission("payroll", "view_dashboard"),
  controller.getThirdPartyPayouts
);

module.exports = router;
