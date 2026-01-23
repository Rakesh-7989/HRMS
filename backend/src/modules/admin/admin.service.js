const pool = require("../../config/db");

const queryDb = (req) =>
  req && req.query ? req.query : pool.query.bind(pool);

// Tenant company profile (for settings page - future use)
exports.getTenantProfile = async (db, tenantId) => {
  const query = queryDb(db);

  return (
    await query(
      `
      SELECT name, domain, email, phone, city, state, country
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

  if (updates.length === 0) return null;

  return (
    await query(
      `
      UPDATE tenants
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING name, domain, email, phone, city, state, country
      `,
      params
    )
  ).rows[0];
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
