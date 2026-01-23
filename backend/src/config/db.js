const { Pool } = require("pg");
const env = require("./env");
const logger = require("./logger");
const asyncContext = require("../utils/asyncContext");

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  logger.error("Unexpected PG pool error", { err });
});

// --------- RLS SESSION WRAPPER ---------
async function withContext(client) {
  const store = asyncContext.getStore();
  if (!store) return;

  const tenantId = store.get("tenantId");
  const userId = store.get("userId");
  const employeeId = store.get("employeeId");
  const role = store.get("role");

  // SUPER ADMIN bypasses tenant isolation
  if (role === "SUPER_ADMIN") {
    await client.query(`SET app.role = 'SUPER_ADMIN'`);
    // Use RESET to correctly unset the variable so current_setting returns NULL
    await client.query(`RESET app.tenant_id`);
  } else {
    // Escape string values for SET command (quotes must be escaped)
    if (role) {
      await client.query(`SET app.role = '${role.replace(/'/g, "''")}'`);
    } else {
      // Ensure app.role exists even if empty, to prevent "unrecognized configuration parameter" if policy is strict
      await client.query(`SET app.role = ''`);
    }

    if (tenantId) {
      await client.query(`SET app.tenant_id = '${tenantId.toString()}'`);
    }
  }

  // Escape string values for SET command
  if (userId) {
    await client.query(`SET app.user_id = '${userId.toString()}'`);
  }
  if (employeeId) {
    await client.query(`SET app.employee_id = '${employeeId.toString()}'`);
  }
}

// --------- OVERRIDE pool.query ---------
pool.query = async (text, params) => {
  const client = await pool.connect();
  try {
    await withContext(client);
    return await client.query(text, params);
  } finally {
    await client.query("RESET ALL");
    client.release();
  }
};

// --------- OVERRIDE pool.connect ---------
const originalConnect = pool.connect.bind(pool);

pool.connect = async (...args) => {
  const client = await originalConnect(...args);
  try {
    await withContext(client);
    return client;
  } catch (err) {
    client.release();
    throw err;
  }
};

module.exports = pool;
