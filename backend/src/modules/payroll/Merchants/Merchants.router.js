const express = require("express");
const router = express.Router();

const verifyJwt = require("../../../middleware/verifyJwt");
const validate = require("../../../middleware/validate");
const requireRole = require("../../../middleware/requireRole");

const controller = require("./Merchants.controller");
const {
  createVendorPaymentSchema,
  createThirdPartyPayoutSchema
} = require("./Merchants.validator");

router.use(verifyJwt);

/* Vendor / Consultant Payments */
router.post(
  "/createvendors",
  requireRole(["ADMIN", "HR"]),
  validate(createVendorPaymentSchema),
  controller.createVendorPayment
);

router.get(
  "/getvendors",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  controller.getVendorPayments
);

/* 3rd Party Payroll Payouts */
router.post(
  "/createthird-party",
  requireRole(["ADMIN", "HR"]),
  validate(createThirdPartyPayoutSchema),
  controller.createThirdPartyPayout
);

router.get(
  "/getthird-party",
  requireRole(["ADMIN", "HR"]),
  controller.getThirdPartyPayouts
);

/* Merchant Transactions */
router.get(
  "/transactions",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  controller.getMerchantTransactions
);

router.get(
  "/",
  requireRole(["ADMIN", "HR", "MANAGER"]),
  controller.getVendorPayments
);

module.exports = router;
