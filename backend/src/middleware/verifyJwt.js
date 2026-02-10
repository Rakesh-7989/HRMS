const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const env = require("../config/env");
const { UnauthorizedError } = require("../utils/customErrors");

module.exports = async function verifyJwt(req, res, next) {
  // Allow unauthenticated read-only access to public payroll placeholder endpoints
  // but ONLY when the client does not send an Authorization header.
  // This avoids skipping authentication when a token is present (which caused 403s
  // because subsequent requireRole middleware expects req.user to be set).
  const originalPath = req.originalUrl || req.url || '';
  const header = req.headers.authorization;
  if (req.method === 'GET' && /^\/api\/payroll(\/|$)/.test(originalPath) && !header) {
    return next();
  }

  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid Authorization header"));
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }

  try {
    // Set minimal RLS variables for the initial user lookup, if possible
    // (We rely on decoded token having tenantId or simply bypassing for this lookup if needed)
    // Actually, let's update the store right away if we have the decoded tenant ID
    const store = require("../utils/asyncContext").getStore();
    if (store && decoded.tenantId) {
      store.set("tenantId", decoded.tenantId);
      // We don't have role yet, but maybe tenantId is enough for RLS access to 'users' table?
      // If users table is RLS protected by tenant_id, this is crucial.
    } else if (store) {
      // If we don't have tenantId (SUPER ADMIN?), we might need to be careful.
    }

    // Fetch full user details INCLUDING employee id (join employees table)
    const userRes = await pool.query(
      `
      SELECT 
          u.id,
          u.tenant_id,
          u.role,
          u.must_change_password,
          u.is_active,
          u.portal_access_until,
          e.id AS employee_id
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.id = $1
      `,
      [decoded.id]
    );

    if (userRes.rowCount === 0) {
      return next(new UnauthorizedError("User not found"));
    }

    const user = userRes.rows[0];

    // Check if user account is still active
    if (!user.is_active) {
      return next(new UnauthorizedError("User account is inactive"));
    }

    // Check if portal access has expired (portal_access_until restriction)
    if (user.portal_access_until) {
      const accessUntil = new Date(user.portal_access_until);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare dates only, not time

      if (accessUntil < today) {
        return next(new UnauthorizedError("Portal access has expired. Please contact your administrator."));
      }
    }

    // SECURITY FIX: Check if the SPECIFIC session from the token is active
    // Previously: checked if ANY session was active, allowing revoked tokens to work
    if (decoded.sessionId) {
      // New tokens have sessionId - validate it specifically
      const sessionRes = await pool.query(
        `SELECT id, is_revoked FROM user_sessions 
         WHERE id = $1 AND user_id = $2`,
        [decoded.sessionId, decoded.id]
      );

      if (sessionRes.rowCount === 0) {
        return next(new UnauthorizedError("Session not found - please login again"));
      }

      if (sessionRes.rows[0].is_revoked) {
        return next(new UnauthorizedError("Session has been revoked - please login again"));
      }
    } else {
      // Legacy tokens without sessionId - use old check (backwards compatibility)
      // TODO: Remove this fallback after all users have re-logged in
      const sessionRes = await pool.query(
        `SELECT id, is_revoked FROM user_sessions 
         WHERE user_id = $1 AND is_revoked = false
         ORDER BY created_at DESC LIMIT 1`,
        [decoded.id]
      );

      if (sessionRes.rowCount === 0) {
        return next(new UnauthorizedError("Session has been revoked - please login again"));
      }
    }

    // Build req.user for controllers
    req.user = {
      id: user.id,
      tenantId: user.tenant_id,
      employeeId: user.employee_id || null,
      role: user.role,
      mustChangePassword: user.must_change_password
    };

    // Set PostgreSQL RLS session variables
    // We update the async context store so that the db middleware (src/middleware/db.js)
    // can automatically set these variables on the connection when queries are executed.
    if (store) {
      store.set("tenantId", user.tenant_id);
      store.set("role", user.role);
      store.set("userId", user.id);
      store.set("employeeId", user.employee_id);
    }

    next();
  } catch (err) {
    console.error("VerifyJWT DB Error:", err); // Log the real error!
    return next(new Error("Internal Server Error during authentication check"));
  }
};
