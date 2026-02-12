const pool = require("../../config/db");

const queryDb = (req) =>
  req && req.query ? req.query : pool.query.bind(pool);

// Tenant company profile (for settings page - future use)
exports.getTenantProfile = async (db, tenantId) => {
  const query = queryDb(db);

  return (
    await query(
      `
      SELECT name, domain, email, phone, address, city, state, country, settings
      FROM tenants
      WHERE id=$1
      `,
      [tenantId]
    )
  ).rows[0];
};

exports.updateTenantProfile = async (db, tenantId, data) => {
  const query = queryDb(db);

  const updates = [];
  const params = [tenantId];
  let i = 2;

  if (data.name) {
    updates.push(`name = $${i}`);
    params.push(data.name);
    i++;
  }
  if (data.phone) {
    updates.push(`phone = $${i}`);
    params.push(data.phone);
    i++;
  }
  if (data.address) {
    updates.push(`address = $${i}`);
    params.push(data.address);
    i++;
  }
  if (data.city) {
    updates.push(`city = $${i}`);
    params.push(data.city);
    i++;
  }
  if (data.state) {
    updates.push(`state = $${i}`);
    params.push(data.state);
    i++;
  }
  if (data.country) {
    updates.push(`country = $${i}`);
    params.push(data.country);
    i++;
  }
  if (data.settings) {
    // Get current settings first to merge
    const current = (await query(`SELECT settings FROM tenants WHERE id=$1`, [tenantId])).rows[0];
    const newSettings = { ...(current?.settings || {}), ...data.settings };
    updates.push(`settings = $${i}`);
    params.push(newSettings);
    i++;
  }

  if (updates.length === 0) return null;

  return (
    await query(
      `
      UPDATE tenants
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING name, domain, email, phone, address, city, state, country, settings
      `,
      params
    )
  ).rows[0];
};

exports.updateTenantLogo = async (db, tenantId, logoUrl) => {
  const query = queryDb(db);

  // 1. Get current settings
  const current = (await query(`SELECT settings FROM tenants WHERE id=$1`, [tenantId])).rows[0];
  let settings = current?.settings || {};
  const oldLogoUrl = settings.logo_url;

  // 2. Update logo_url
  settings.logo_url = logoUrl;

  // 3. Save
  await query(
    `UPDATE tenants SET settings=$1, updated_at=NOW() WHERE id=$2`,
    [settings, tenantId]
  );

  return { settings, oldLogoUrl };
};

// Audit logs (admin only) - for audit trail feature (future use)
exports.getAuditLogs = async (db, tenantId) => {
  const query = queryDb(db);

  return (
    await query(
      `
      SELECT *
      FROM audit_logs
      WHERE tenant_id=$1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [tenantId]
    )
  ).rows;
};
