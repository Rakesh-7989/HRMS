const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");

const ACCESS_EXP = env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXP_DAYS = 7;

const parseRefreshExpiry = (expiryStr) => {
    if (!expiryStr) return REFRESH_EXP_DAYS;
    const match = expiryStr.match(/^(\d+)([dhms])$/);
    if (!match) return REFRESH_EXP_DAYS;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
        case 'd': return value;
        case 'h': return value / 24;
        case 'm': return value / (24 * 60);
        case 's': return value / (24 * 60 * 60);
        default: return REFRESH_EXP_DAYS;
    }
};

const MAX_ACTIVE_SESSIONS = 10;

exports.generateTokens = async (user, rememberMe = false) => {
    const refreshDays = rememberMe ? 30 : parseRefreshExpiry(env.REFRESH_TOKEN_EXPIRES_IN);
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const sessionId = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    // Enforce max active sessions per user
    const activeSessions = await pool.query(
        `SELECT id FROM user_sessions 
         WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()`,
        [user.id]
    );
    if (activeSessions.rowCount >= MAX_ACTIVE_SESSIONS) {
        // Revoke oldest session
        await pool.query(
            `UPDATE user_sessions SET is_revoked = true 
             WHERE user_id = $1 AND is_revoked = false 
             ORDER BY created_at ASC LIMIT 1`,
            [user.id]
        );
    }

    // Insert session first to get the ID
    await pool.query(
        `INSERT INTO user_sessions 
           (id, tenant_id, user_id, refresh_token, expires_at, ip_address, user_agent, remember_me)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            sessionId,
            user.tenant_id || null,
            user.id,
            refreshToken,
            expiresAt,
            user.ip || null,
            user.ua || null,
            rememberMe
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
        { expiresIn: ACCESS_EXP, algorithm: 'HS256' }
    );

    return { accessToken, refreshToken, sessionId };
};


exports.verifyRefreshToken = async (refreshToken, ip, userAgent) => {
    const res = await pool.query(
        `SELECT id, user_id, expires_at, is_revoked, ip_address, user_agent
         FROM user_sessions
         WHERE refresh_token = $1`,
        [refreshToken]
    );

    if (res.rowCount === 0) return null;

    const row = res.rows[0];

    if (row.is_revoked) return null;
    if (new Date(row.expires_at) < new Date()) return null;

    // IP change: log as suspicious but don't revoke (mobile users change IPs)
    if (row.ip_address && row.ip_address !== ip) {
        console.warn(`Suspicious IP change for session ${row.id}: ${row.ip_address} -> ${ip}`);
    }

    // User-Agent change: revoke session (likely token theft)
    if (row.user_agent && row.user_agent !== userAgent) {
        await pool.query('UPDATE user_sessions SET is_revoked = true WHERE id = $1', [row.id]);
        throw new Error("Session fingerprint mismatch. Session revoked for security.");
    }

    return row;
};

exports.updateSessionActivity = async (oldToken, newToken, ip, userAgent) => {
    const res = await pool.query(
        `UPDATE user_sessions 
         SET refresh_token = $1, updated_at = now(), ip_address = $2, user_agent = $3
         WHERE refresh_token = $4 AND is_revoked = false
         RETURNING id`,
        [newToken, ip, userAgent, oldToken]
    );
    return res.rowCount > 0;
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
        `SELECT id,
                CONCAT(LEFT(refresh_token::text, 8), '****', RIGHT(refresh_token::text, 4)) AS token_masked,
                created_at, expires_at, 
                ip_address, user_agent, is_revoked, remember_me
         FROM user_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );
    return res.rows.map(r => ({ ...r, token: r.token_masked, token_masked: undefined }));
};
