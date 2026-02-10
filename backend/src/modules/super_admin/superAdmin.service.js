const { query: dbQuery } = require("../../middleware/db");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : dbQuery;

exports.getAllTenants = async (db) => {
  const query = getQuery(db);
  const res = await query(
    `
      SELECT 
        t.id, t.name, t.email, t.is_active, t.created_at, t.updated_at,
        COALESCE(usr.count, 0)::int AS employee_count,
        COALESCE(p.name, 'No Plan') AS plan_name,
        COALESCE(s.status, 'N/A') AS subscription_status,
        s.is_trial
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS count 
        FROM users 
        WHERE is_deleted = false
        GROUP BY tenant_id
      ) usr ON usr.tenant_id = t.id
      LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status IN ('ACTIVE', 'TRIAL', 'CANCEL_AT_PERIOD_END', 'PENDING_PAYMENT')
      LEFT JOIN plans p ON p.id = s.plan_id
      ORDER BY t.created_at DESC
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
    `SELECT COUNT(*) AS count FROM users WHERE tenant_id = $1 AND is_deleted = false`,
    [tenantId]
  );
  return Number(res.rows[0]?.count || 0);
};

exports.getPlans = async (db) => {
  const query = getQuery(db);
  // Fetch plans with their active monthly price
  // We prefer the price from plan_prices if available, else fallback to legacy price column
  const res = await query(`
    SELECT 
      p.*,
      COALESCE(
        (SELECT unit_amount FROM plan_prices pp 
         WHERE pp.plan_id = p.id AND pp.interval = 'MONTHLY' AND pp.is_active = true 
         ORDER BY pp.created_at DESC LIMIT 1),
        p.price
      ) as current_price
    FROM plans p 
    ORDER BY p.name ASC
  `);

  // Transform to match frontend expectation (map current_price to price)
  return res.rows.map(row => ({
    ...row,
    price: parseFloat(row.current_price || 0)
  }));
};

exports.updatePlan = async (db, id, data) => {
  const query = getQuery(db);
  const { name, price, max_employees, features, is_active } = data;

  // 1. Update Plan Basic Info
  // We determine if we need to update the price history
  // First, get current plan to check logic
  const currentPlanRes = await query(`SELECT * FROM plans WHERE id = $1`, [id]);
  if (currentPlanRes.rowCount === 0) throw new Error("Plan not found");

  // Update the plan table (legacy price column updated too for consistency)
  const res = await query(
    `
      UPDATE plans
      SET name = $1, price = $2, max_employees = $3, features = $4, is_active = $5, updated_at = now()
      WHERE id = $6
      RETURNING *
    `,
    [name, price, max_employees, JSON.stringify(features), is_active, id]
  );

  // 2. Handle Price Versioning (If price changed)
  // Check if there is an active monthly price
  const currentPriceRes = await query(`
    SELECT * FROM plan_prices 
    WHERE plan_id = $1 AND interval = 'MONTHLY' AND is_active = true
  `, [id]);

  const currentPrice = currentPriceRes.rows.length > 0 ? parseFloat(currentPriceRes.rows[0].unit_amount) : null;

  if (currentPrice !== parseFloat(price)) {
    // Deactivate old monthly price
    await query(`
      UPDATE plan_prices 
      SET is_active = false, active_to = NOW() 
      WHERE plan_id = $1 AND interval = 'MONTHLY' AND is_active = true
    `, [id]);

    // Insert new monthly price
    await query(`
      INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount, currency, is_active, active_from)
      VALUES ($1, 'MONTHLY', 1, $2, 'INR', true, NOW())
    `, [id, price]);

    // Update YEARLY price as well (x12)
    // Deactivate old yearly price
    await query(`
      UPDATE plan_prices 
      SET is_active = false, active_to = NOW() 
      WHERE plan_id = $1 AND interval = 'YEARLY' AND is_active = true
    `, [id]);

    // Insert new yearly price
    await query(`
      INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount, currency, is_active, active_from)
      VALUES ($1, 'YEARLY', 1, $2, 'INR', true, NOW())
    `, [id, price * 12]);
  }

  return res.rows[0] || null;
};

exports.createPlan = async (db, data) => {
  const query = getQuery(db);
  const { name, price, max_employees, features, is_active = true } = data;

  // 1. Insert Plan
  const res = await query(
    `
      INSERT INTO plans (name, price, max_employees, features, is_active, code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [name, price, max_employees, JSON.stringify(features), is_active, name.toUpperCase().replace(/\s+/g, '_')]
  );

  const plan = res.rows[0];

  // 2. Insert Initial Price
  await query(`
    INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount, currency, is_active)
    VALUES ($1, 'MONTHLY', 1, $2, 'INR', true)
  `, [plan.id, price]);

  return plan;
};

exports.deletePlan = async (db, id) => {
  const query = getQuery(db);

  // Soft delete plan
  const res = await query(
    `UPDATE plans SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );

  // Soft delete prices
  await query(
    `UPDATE plan_prices SET is_active = false, active_to = NOW() WHERE plan_id = $1`,
    [id]
  );

  return res.rows[0];
};
