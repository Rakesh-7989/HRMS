const pool = require("../config/db");

/**
 * RLS Context Middleware
 * Sets PostgreSQL session variables for Row Level Security
 * 
 * SECURITY FIX: Using parameterized queries instead of string interpolation
 * to prevent SQL injection attacks.
 */
module.exports = async function rls(req, res, next) {
  if (!req.user) return next(); // public routes skip this

  const { tenantId, role, id: userId, employeeId } = req.user;

  try {
    // FIXED: Use set_config with parameterized values instead of string interpolation
    await pool.query(
      `SELECT 
        set_config('app.tenant_id', $1, true),
        set_config('app.role', $2, true),
        set_config('app.user_id', $3, true),
        set_config('app.employee_id', $4, true)
      `,
      [
        tenantId || '',
        role || '',
        userId || '',
        employeeId || ''
      ]
    );
  } catch (err) {
    console.error("RLS context set error:", err);
    // Don't block the request, but log the error
  }

  next();
};
