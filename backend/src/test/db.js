const { Pool } = require('pg');

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

async function cleanDb(tables = []) {
  if (tables.length === 0) {
    tables = ['user_sessions', 'users', 'employees', 'tenants', 'departments', 'designations'];
  }
  for (const table of tables) {
    try {
      await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
    } catch {
    }
  }
}

async function closePool() {
  await testPool.end();
}

module.exports = { testPool, cleanDb, closePool };
