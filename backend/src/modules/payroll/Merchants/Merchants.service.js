const db = require("../../../config/db");

/* Vendor Payments */
const createVendorPayment = async (tenantId, userId, payload) => {
  const query = `
    INSERT INTO vendor_payments
      (tenant_id, vendor_name, amount, payment_date, created_by)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;
  return (
    await db.query(query, [
      tenantId,
      payload.vendorName,
      payload.amount,
      payload.paymentDate,
      userId
    ])
  ).rows[0];
};

const getVendorPayments = async (tenantId) => {
  return (
    await db.query(
      `SELECT * FROM vendor_payments
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    )
  ).rows;
};

/* 3rd Party Payroll */
const createThirdPartyPayout = async (tenantId, userId, payload) => {
  const query = `
    INSERT INTO third_party_payouts
      (tenant_id, provider_name, amount, payout_date, created_by)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;
  return (
    await db.query(query, [
      tenantId,
      payload.providerName,
      payload.amount,
      payload.payoutDate,
      userId
    ])
  ).rows[0];
};

const getThirdPartyPayouts = async (tenantId) => {
  return (
    await db.query(
      `SELECT * FROM third_party_payouts
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    )
  ).rows;
};

/* Merchant Transactions (Read-only) */
const getMerchantTransactions = async (tenantId) => {
  return (
    await db.query(
      `SELECT * FROM merchant_transactions
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    )
  ).rows;
};

module.exports = {
  createVendorPayment,
  getVendorPayments,
  createThirdPartyPayout,
  getThirdPartyPayouts,
  getMerchantTransactions
};
