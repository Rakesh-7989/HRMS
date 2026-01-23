const service = require("./Merchants.service");

/* Vendor Payments */
const createVendorPayment = async (req, res) => {
  const data = await service.createVendorPayment(
    req.user.tenantId,
    req.user.id,
    req.body
  );
  res.status(201).json({ status: "success", data });
};

const getVendorPayments = async (req, res) => {
  const data = await service.getVendorPayments(req.user.tenantId);
  res.json({ status: "success", data });
};

/* 3rd Party Payroll */
const createThirdPartyPayout = async (req, res) => {
  const data = await service.createThirdPartyPayout(
    req.user.tenantId,
    req.user.id,
    req.body
  );
  res.status(201).json({ status: "success", data });
};

const getThirdPartyPayouts = async (req, res) => {
  const data = await service.getThirdPartyPayouts(req.user.tenantId);
  res.json({ status: "success", data });
};

/* Merchant Transactions */
const getMerchantTransactions = async (req, res) => {
  const data = await service.getMerchantTransactions(req.user.tenantId);
  res.json({ status: "success", data });
};

module.exports = {
  createVendorPayment,
  getVendorPayments,
  createThirdPartyPayout,
  getThirdPartyPayouts,
  getMerchantTransactions
};
