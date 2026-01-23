const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");

const ACCESS_EXP = env.JWT_EXPIRES_IN || "15m";
const REFRESH_DAYS = parseInt(env.REFRESH_TOKEN_EXPIRY_DAYS || "7", 10);

exports.generateTokens = async (user, rememberMe = false) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      employeeId: user.employee_id
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: rememberMe ? "30d" : ACCESS_EXP }
  );

  const refreshDays = rememberMe ? 30 : REFRESH_DAYS;
  const refreshToken = crypto.randomBytes(48).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshDays);

  await pool.query(
    `INSERT INTO user_sessions 
       (tenant_id, user_id, refresh_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.tenant_id || null,
      user.id,
      refreshToken,
      expiresAt,
      user.ip || null,
      user.ua || null
    ]
  );

  return { accessToken, refreshToken };
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
