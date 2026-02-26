const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");

const ACCESS_EXP = env.JWT_EXPIRES_IN || "15m";
const REFRESH_DAYS = parseInt(env.REFRESH_TOKEN_EXPIRY_DAYS || "7", 10);

exports.generateTokens = async (user, rememberMe = false) => {
  const refreshDays = rememberMe ? 30 : REFRESH_DAYS;
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const sessionId = crypto.randomUUID(); // Generate unique session ID

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshDays);

  // Insert session first to get the ID
  await pool.query(
    `INSERT INTO user_sessions 
       (id, tenant_id, user_id, refresh_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      user.tenant_id || null,
      user.id,
      refreshToken,
      expiresAt,
      user.ip || null,
      user.ua || null
    ]
  );

  // SECURITY FIX: Include sessionId in JWT payload for proper revocation
  const accessToken = jwt.sign(
    {
      id: user.id,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      employeeId: user.employee_id,
      sessionId: sessionId // NEW: Include session ID for revocation check
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: rememberMe ? "30d" : ACCESS_EXP }
  );

  return { accessToken, refreshToken, sessionId };
};


exports.verifyRefreshToken = async (refreshToken) => {
  const res = await pool.query(
    `SELECT id, user_id, expires_at, is_revoked
     FROM user_sessions
     WHERE refresh_token = $1`,
    [refreshToken]
  );

  if (res.rowCount === 0) return null;

  const row = res.rows[0];

  if (row.is_revoked) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return row;
};

exports.updateSessionActivity = async (sessionId, newToken) => {
  await pool.query(
    `UPDATE user_sessions 
     SET refresh_token = $1, updated_at = now()
     WHERE id = $2`,
    [newToken, sessionId]
  );
};

exports.revokeRefreshToken = async (token) => {
  await pool.query(
    `UPDATE user_sessions SET is_revoked = true WHERE refresh_token = $1`,
    [token]
  );
};

exports.revokeAllOtherSessions = async (userId, exceptToken) => {
  await pool.query(
    `UPDATE user_sessions 
     SET is_revoked = true 
     WHERE user_id = $1 AND refresh_token <> $2`,
    [userId, exceptToken]
  );
};

exports.listSessions = async (userId) => {
  const res = await pool.query(
    `SELECT id, refresh_token AS token, created_at, expires_at, 
            ip_address, user_agent, is_revoked
     FROM user_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
};
exports.getUserPermissions = async (userId, tenantId = null, role = null) => {
  // During login, there is no async context store, so pool.query's withContext
  // sets empty RLS vars. On production (non-superuser DB user), this causes
  // RLS policies to block access. We manually set context on a raw client.
  const { Pool } = require("pg");
  const origConnect = Object.getPrototypeOf(pool).connect.bind(pool);
  const client = await origConnect();
  try {
    // Set RLS context so user_roles RLS policy passes
    if (role) {
      await client.query(`SELECT set_config('app.role', $1, true)`, [role]);
    }
    if (tenantId) {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId.toString()]);
    }
    if (userId) {
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId.toString()]);
    }

    // SUPER_ADMIN now uses role-permission assignments like other roles
    // Platform permissions are always included as a safety net
    if (role === 'SUPER_ADMIN') {
      const res = await client.query(
        `SELECT DISTINCT p.name
         FROM (
           SELECT role_id FROM user_roles WHERE user_id = $1
           UNION
           SELECT r.id FROM users u
           JOIN roles r ON (r.name = u.role AND (r.tenant_id = u.tenant_id OR (r.tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM roles r2 WHERE r2.name = u.role AND r2.tenant_id = u.tenant_id))))
           WHERE u.id = $1
         ) user_all_roles
         JOIN role_permissions rp ON rp.role_id = user_all_roles.role_id
         JOIN permissions p ON p.id = rp.permission_id`,
        [userId]
      );
      const perms = res.rows.map(r => r.name);
      // Always ensure platform-level permissions for SUPER_ADMIN
      const platformRes = await client.query(
        `SELECT name FROM permissions WHERE name LIKE 'platform.%'`
      );
      const platformPerms = platformRes.rows.map(r => r.name);
      return [...new Set([...perms, ...platformPerms])];
    }

    const res = await client.query(
      `SELECT DISTINCT p.name
       FROM (
         SELECT role_id FROM user_roles WHERE user_id = $1
         UNION
         SELECT r.id FROM users u
         JOIN roles r ON (r.name = u.role AND (r.tenant_id = u.tenant_id OR (r.tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM roles r2 WHERE r2.name = u.role AND r2.tenant_id = u.tenant_id))))
         WHERE u.id = $1
       ) user_all_roles
       JOIN role_permissions rp ON rp.role_id = user_all_roles.role_id
       JOIN permissions p ON p.id = rp.permission_id`,
      [userId]
    );
    return res.rows.map(r => r.name);
  } finally {
    await client.query("RESET ALL");
    client.release();
  }
};
