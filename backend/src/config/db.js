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

// const { Pool } = require("pg");
// const env = require("./env");
// const logger = require("./logger");
// const asyncContext = require("../utils/asyncContext");

// const pool = new Pool({
//   connectionString: env.DATABASE_URL,
//   // Enable SSL if in production OR if connecting to a remote host (like Render)
//   ssl: (env.NODE_ENV === "production" || !env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1'))
//     ? { rejectUnauthorized: false }
//     : false,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
// });

// // Log unexpected errors
// pool.on("error", (err) => {
//   logger.error("Unexpected PG pool error", err);
//   // Optional: process.exit(1); 
// });

// // ---------- RLS SESSION SETUP ----------
// async function applyRLSContext(client) {
//   const store = asyncContext.getStore();
//   if (!store || typeof store.get !== 'function') return;

//   const tenantId = store.get("tenantId");
//   const userId = store.get("userId");
//   const employeeId = store.get("employeeId");
//   const role = store.get("role");

//   /**
//    * IMPORTANT: 'SET' command in PostgreSQL does not support bind parameters ($1).
//    * We use 'SELECT set_config(setting_name, new_value, is_local)' which is a 
//    * function and allows parameter binding, making it both safe and functional.
//    */

//   if (role === "SUPER_ADMIN") {
//     await client.query("SELECT set_config('app.role', 'SUPER_ADMIN', true)");
//     await client.query("RESET app.tenant_id");
//   } else {
//     await client.query("SELECT set_config('app.role', $1, true)", [role || ""]);
//     if (tenantId) {
//       await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId.toString()]);
//     }
//   }

//   if (userId) {
//     await client.query("SELECT set_config('app.user_id', $1, true)", [userId.toString()]);
//   }

//   if (employeeId) {
//     await client.query("SELECT set_config('app.employee_id', $1, true)", [employeeId.toString()]);
//   }
// }

// // ---------- MONKEY-PATCH POOL METHODS ----------

// // Original methods
// const originalQuery = pool.query.bind(pool);
// const originalConnect = pool.connect.bind(pool);

// /**
//  * Patch pool.connect to automatically apply RLS context 
//  * to every client acquired from the pool.
//  */
// pool.connect = async (...args) => {
//   const client = await originalConnect(...args);
//   try {
//     await applyRLSContext(client);
//     return client;
//   } catch (err) {
//     client.release();
//     throw err;
//   }
// };

// /**
//  * Patch pool.query to ensure it uses the context-aware connect method.
//  * pg's Pool.prototype.query internally calls this.connect().
//  */
// pool.query = async (text, params) => {
//   const client = await pool.connect();
//   try {
//     return await client.query(text, params);
//   } finally {
//     client.release();
//   }
// };

// // ---------- EXPORT ----------
// // Exporting the pool instance directly ensures compatibility with all 
// // modules expecting a PgPool (with .on, .connect, .query, etc.)
// module.exports = pool;