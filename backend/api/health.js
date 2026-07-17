process.on('unhandledRejection', (reason) => {
  console.error('HEALTH UNHANDLED REJECTION:', reason);
});

let pool;
try {
  const { Pool } = require('pg');
  const env = require('../src/config/env');
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} catch (err) {
  console.error('HEALTH DB POOL ERROR:', err.message);
}

module.exports = async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
  if (pool) {
    try {
      await pool.query('SELECT 1');
      health.database = 'connected';
    } catch {
      health.database = 'disconnected';
      health.status = 'degraded';
    }
  } else {
    health.database = 'unavailable';
    health.status = 'degraded';
  }
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
};
