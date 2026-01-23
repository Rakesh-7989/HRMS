const authService = require("./auth.service");
const logger = require("../../config/logger");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");
const mailer = require("../../config/mailer");
const logAudit = require("../../utils/auditLogger");

exports.login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    // Get user + employee data
    const userRes = await pool.query(
      `SELECT 
          u.id,
          u.email,
          u.tenant_id,
          u.password_hash,
          u.role,
          u.is_active,
          u.must_change_password,
          u.last_login_at,
          e.id AS employee_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    // Validate password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login timestamp
    await pool.query(
      `UPDATE users SET last_login_at = now(), updated_at = now()
       WHERE id = $1`,
      [user.id]
    );

    // Add metadata for token logging
    user.ip = req.ip;
    user.ua = req.headers["user-agent"];

    // Generate JWT + Refresh Token
    const tokens = await authService.generateTokens(user, rememberMe);

    // Audit Login (Async, don't await)
    // We construct a mock req where user is populated for logAudit
    const mockReq = { ...req, user: { tenantId: user.tenant_id, userId: user.id } };
    logAudit(mockReq, 'users', user.id, 'LOGIN', null, { ip: req.ip }).catch(e => console.error(e));

    return res.json({
      status: "success",
      role: user.role,
      tenantId: user.tenant_id,
      mustChangePassword: user.must_change_password,
      ...tokens
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const session = await authService.verifyRefreshToken(refresh_token);
    if (!session) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Fetch user
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.tenant_id, u.role, e.id AS employee_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = $1`,
      [session.user_id]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    const user = userRes.rows[0];

    // Create new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        employeeId: user.employee_id
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const newRefreshToken = crypto.randomBytes(48).toString("hex");

    await authService.updateSessionActivity(session.id, newRefreshToken);

    return res.json({
      status: "success",
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);
    return res.status(500).json({ message: "Refresh failed" });
  }
};


// ========================================================================
// LOGOUT
// ========================================================================
exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ status: "error", message: "Refresh token is required" });
    }

    // Revoke the current refresh token
    await authService.revokeRefreshToken(refresh_token);

    // Invalidate access token by adding it to blacklist (add this to redis if needed)
    // For now, the frontend should discard the access token

    // Audit Logout
    if (req.user) {
      logAudit(req, 'users', req.user.id, 'LOGOUT', null, null).catch(e => console.error(e));
    }

    return res.json({ status: "success", message: "Logged out successfully" });

  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({ status: "error", message: "Logout failed" });
  }
};


// ========================================================================
// LOGOUT ALL OTHER DEVICES
// ========================================================================
exports.logoutAllOtherDevices = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ status: "error", message: "Refresh token is required" });
    }

    const authHeader = req.headers.authorization;
    const currentAccessToken = authHeader?.split(" ")[1];

    if (!currentAccessToken) {
      return res.status(401).json({ status: "error", message: "Access token is required" });
    }

    const decoded = jwt.verify(currentAccessToken, env.JWT_ACCESS_SECRET);

    await authService.revokeAllOtherSessions(decoded.id, refresh_token);

    return res.json({
      status: "success",
      message: "Successfully logged out from all other devices"
    });

  } catch (error) {
    console.error("LOGOUT OTHER DEVICES ERROR:", error);
    return res.status(500).json({ status: "error", message: "Failed to logout from other devices" });
  }
};


// ========================================================================
// ACTIVE SESSIONS
// ========================================================================
exports.listActiveSessions = async (req, res) => {
  try {
    const sessions = await authService.listSessions(req.user.id);
    return res.json({ status: "success", sessions });

  } catch (error) {
    console.error("LIST SESSIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};


// ========================================================================
// FORGOT PASSWORD
// ========================================================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES ($1, $2, now() + interval '15 minutes')`,
      [email, token]
    );

    try {
      await mailer.sendPasswordResetEmail(email, token);
    } catch (mailErr) {
      console.error("Email sending failed:", mailErr);
    }

    return res.json({
      status: "success",
      message: "Password reset email sent"
    });

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to process request" });
  }
};


// ========================================================================
// RESET PASSWORD (via token)
// ========================================================================
exports.resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  try {
    // 1. Validate input
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Check reset token
    const row = await pool.query(
      `SELECT email FROM password_resets 
       WHERE token = $1 AND expires_at > now()`,
      [token]
    );

    if (row.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = row.rows[0].email;

    // 3. Hash password safely
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update user's password
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = false,
           last_password_change = now(),
           updated_at = now()
       WHERE email = $2`,
      [hashedPassword, email]
    );

    // 5. Delete reset token so it cannot be reused
    await pool.query(`DELETE FROM password_resets WHERE token = $1`, [token]);

    return res.json({
      status: "success",
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};



// ========================================================================
// CHANGE PASSWORD (Logged-in user)
// ========================================================================
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const row = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (row.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate old password
    const valid = await bcrypt.compare(currentPassword, row.rows[0].password_hash);

    if (!valid) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1,
           must_change_password = false,
           last_password_change = now(),
           updated_at = now()
       WHERE id = $2`,
      [hash, userId]
    );

    return res.json({
      status: "success",
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};
