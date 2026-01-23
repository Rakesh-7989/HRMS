const { Pool } = require("pg");
const asyncContext = require("../utils/asyncContext");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Add RLS per-query setup
async function query(sql, params) {
  const ctx = asyncContext.getStore();

  const client = await pool.connect();
  try {
    if (ctx) {
      const tenantId = ctx.get("tenantId");
      const role = ctx.get("role");
      const userId = ctx.get("userId");
      const employeeId = ctx.get("employeeId");

      if (role === 'SUPER_ADMIN') {
        await client.query(`SELECT set_config('app.tenant_id', '', true)`);
        await client.query(`SELECT set_config('app.role', 'SUPER_ADMIN', true)`);
      } else {
        await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId || '']);
        await client.query(`SELECT set_config('app.role', $1, true)`, [role || '']);
      }

      await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId || '']);
      await client.query(`SELECT set_config('app.employee_id', $1, true)`, [employeeId || '']);
    }

    const result = await client.query(sql, params);
    return result;
  } finally {
    await client.query("RESET ALL;");
    client.release();
  }
}

module.exports = { query, pool };
