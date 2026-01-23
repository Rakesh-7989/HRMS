const { query: dbQuery } = require("../../middleware/db");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : dbQuery;

exports.getAllTenants = async (db) => {
  const query = getQuery(db);
  const res = await query(
    `
      SELECT id, name, email, is_active, created_at, updated_at
      FROM tenants
      ORDER BY created_at DESC
    `
  );
  return res.rows;
};

exports.getTenantCount = async (db) => {
  const query = getQuery(db);
  const res = await query(`SELECT COUNT(*) AS count FROM tenants`);
  return Number(res.rows[0].count);
};

exports.getEmployeeCount = async (db) => {
  const query = getQuery(db);
  const res = await query(`SELECT COUNT(*) AS count FROM employees`);
  return Number(res.rows[0].count);
};

exports.getTenantById = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(
    `
      SELECT *
      FROM tenants
      WHERE id = $1
    `,
    [tenantId]
  );
  return res.rows[0] || null;
};

exports.getUsersByTenant = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(
    `
      SELECT id, email, role, is_active, created_at
      FROM users
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `,
    [tenantId]
  );
  return res.rows;
};

exports.updateTenantStatus = async (db, tenantId, isActive) => {
  const query = getQuery(db);
  const res = await query(
    `
      UPDATE tenants
      SET is_active = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, name, is_active
    `,
    [isActive, tenantId]
  );

  return res.rows[0] || null;
};

exports.getTenantEmployeeCount = async (db, tenantId) => {
  const query = getQuery(db);
  const res = await query(
    `SELECT COUNT(*) AS count FROM employees WHERE tenant_id = $1`,
    [tenantId]
  );
  return Number(res.rows[0]?.count || 0);
};
