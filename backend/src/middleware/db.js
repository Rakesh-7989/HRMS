const pool = require("../config/db");

/**
 * Middleware compatibility query function.
 * Uses the primary pool from config/db which already handles RLS context.
 */
async function query(sql, params) {
  return pool.query(sql, params);
}

module.exports = { query, pool };
