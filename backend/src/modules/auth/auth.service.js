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
exports.getUserPermissions = async (userId) => {
  const res = await pool.query(
    `SELECT DISTINCT p.name
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return res.rows.map(r => r.name);
};
