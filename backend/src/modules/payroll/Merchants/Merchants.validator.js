const { z } = require("zod");

/* Vendor / Consultant Payments */
const createVendorPaymentSchema = z.object({
  vendorName: z.string().min(2),
  amount: z.number().positive(),
  paymentDate: z.string()
});

/* 3rd Party Payroll Payouts */
const createThirdPartyPayoutSchema = z.object({
  providerName: z.string().min(2),
  amount: z.number().positive(),
  payoutDate: z.string()
});

/* Merchant Transactions (if ever needed for insert) */
const createMerchantTransactionSchema = z.object({
  merchantName: z.string().min(2),
  transactionType: z.string(),
  amount: z.number().positive(),
  transactionDate: z.string()
});

module.exports = {
  createVendorPaymentSchema,
  createThirdPartyPayoutSchema,
  createMerchantTransactionSchema
};
