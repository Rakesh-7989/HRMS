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
  requireAnyPermission(["payroll.manage"]),
  validate(createVendorPaymentSchema),
  controller.createVendorPayment
);

router.get(
  "/getvendors",
  requireAnyPermission(["payroll.manage", "payroll.view_own"]),
  controller.getVendorPayments
);

/* 3rd Party Payroll Payouts */
router.post(
  "/createthird-party",
  requireAnyPermission(["payroll.manage"]),
  validate(createThirdPartyPayoutSchema),
  controller.createThirdPartyPayout
);

router.get(
  "/getthird-party",
  requireAnyPermission(["payroll.manage"]),
  controller.getThirdPartyPayouts
);

/* Merchant Transactions */
router.get(
  "/transactions",
  requireAnyPermission(["payroll.manage", "payroll.view_own"]),
  controller.getMerchantTransactions
);

router.get(
  "/",
  requireAnyPermission(["payroll.manage", "payroll.view_own"]),
  controller.getVendorPayments
);

module.exports = router;
