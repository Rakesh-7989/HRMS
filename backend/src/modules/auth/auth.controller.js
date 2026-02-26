const authService = require("./auth.service");
const userService = require("../users/user.service");
const logger = require("../../config/logger");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");
const mailer = require("../../config/mailer");
const logAudit = require("../../utils/auditLogger");
const { generateSecret, generateURI, verifySync } = require("otplib");
const QRCode = require("qrcode");

exports.login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    // Get user + employee + tenant data
    const userRes = await pool.query(
      `SELECT 
          u.id,
          u.email,
          u.tenant_id,
          u.password_hash,
          u.role,
          u.is_active,
          u.must_change_password,
          u.two_factor_enabled,
          u.last_login_at,
          e.id AS employee_id,
          t.is_active AS tenant_is_active
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email.toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];

    // Check if tenant is active (unless super admin, maybe? assuming even super admin belongs to a tenant usually, or null tenant for root super admin)
    if (user.tenant_id && user.tenant_is_active === false) {
      return res.status(403).json({ message: "Your organization account has been deactivated. Please contact support." });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    // Validate password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      // Return a temporary token or just a signal that 2FA is required
      // We don't want to give full tokens yet.
      // We generate a short-lived "pre-auth" token
      const preAuthToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenant_id,
          permissions,
          role: user.role,
          employeeId: user.employee_id,
          type: '2FA_PRE_AUTH'
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        status: "2FA_REQUIRED",
        preAuthToken,
        message: "Please enter your 2FA code to continue"
      });
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

    // Fetch permissions
    const permissions = await authService.getUserPermissions(user.id, user.tenant_id, user.role);

    // Generate JWT + Refresh Token
    const tokens = await authService.generateTokens(user, rememberMe, permissions);

    // Audit Login (Async, don't await)
    // We construct a mock req where user is populated for logAudit
    const mockReq = { ...req, user: { tenantId: user.tenant_id, userId: user.id } };
    logAudit(mockReq, 'users', user.id, 'LOGIN', null, { ip: req.ip }).catch(e => console.error(e));

    return res.json({
      status: "success",
      role: user.role,
      tenantId: user.tenant_id,
      permissions,
      default_path: userService.calculateDefaultPath(permissions),
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
        permissions,
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
      [email.toLowerCase(), token]
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
    const updateRes = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = false,
           last_password_change = now(),
           updated_at = now()
       WHERE LOWER(email) = LOWER($2)`,
      [hashedPassword, email]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found for password reset" });
    }

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
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password cannot be the same as current password" });
    }

    const row = await pool.query(
      `SELECT email, password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (row.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = row.rows[0];

    // Validate old password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1,
           must_change_password = false,
           last_password_change = now(),
           updated_at = now()
       WHERE id = $2`,
      [hash, userId]
    );

    // Send notification email
    try {
      await mailer.sendPasswordChangedNotification(user.email);
    } catch (mailErr) {
      console.error("Failed to send password change notification:", mailErr);
      // Don't fail the request if email fails, but log it
    }

    return res.json({
      status: "success",
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};


// ========================================================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ========================================================================

exports.setup2FA = async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: "User not found" });

    const user = userRes.rows[0];
    const secret = generateSecret();
    const otpauth = generateURI({ secret, issuer: "HRMS GIGGLE", label: user.email });
    const qrCodeDataURL = await QRCode.toDataURL(otpauth);

    // Save secret temporarily (maybe don't enable yet)
    await pool.query(
      "UPDATE users SET two_factor_secret = $1 WHERE id = $2",
      [secret, userId]
    );

    return res.json({
      status: "success",
      qrCodeDataURL,
      secret
    });
  } catch (error) {
    console.error("SETUP 2FA ERROR:", error);
    return res.status(500).json({ message: "Failed to setup 2FA" });
  }
};

exports.enable2FA = async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  try {
    const userRes = await pool.query("SELECT two_factor_secret FROM users WHERE id = $1", [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: "User not found" });

    const secret = userRes.rows[0].two_factor_secret;
    const isValid = verifySync({ token, secret });

    if (!isValid) {
      return res.status(400).json({ message: "Invalid 2FA token" });
    }

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex"));

    await pool.query(
      "UPDATE users SET two_factor_enabled = true, two_factor_recovery_codes = $1 WHERE id = $2",
      [JSON.stringify(recoveryCodes), userId]
    );

    return res.json({
      status: "success",
      message: "2FA enabled successfully",
      recoveryCodes
    });
  } catch (error) {
    console.error("ENABLE 2FA ERROR:", error);
    return res.status(500).json({ message: "Failed to enable 2FA" });
  }
};

exports.disable2FA = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  try {
    const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    await pool.query(
      "UPDATE users SET two_factor_enabled = false, two_factor_secret = null, two_factor_recovery_codes = null WHERE id = $1",
      [userId]
    );

    return res.json({
      status: "success",
      message: "2FA disabled successfully"
    });
  } catch (error) {
    console.error("DISABLE 2FA ERROR:", error);
    return res.status(500).json({ message: "Failed to disable 2FA" });
  }
};


// ========================================================================
// VERIFY PASSWORD
// ========================================================================
exports.verifyPassword = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  try {
    const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: "User not found" });

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    return res.json({ status: "success", message: "Password verified" });
  } catch (error) {
    console.error("VERIFY PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to verify password" });
  }
};

exports.verify2FALogin = async (req, res) => {
  const { token, preAuthToken, rememberMe } = req.body;

  try {
    const decoded = jwt.verify(preAuthToken, env.JWT_ACCESS_SECRET);
    if (decoded.type !== '2FA_PRE_AUTH') {
      return res.status(401).json({ message: "Invalid pre-auth token" });
    }

    const userId = decoded.id;
    const userRes = await pool.query(
      `SELECT u.*, e.id AS employee_id FROM users u 
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    const isValid = verifySync({ token, secret: user.two_factor_secret });

    // Check recovery codes if token fails
    let isRecovery = false;
    if (!isValid && user.two_factor_recovery_codes) {
      const idx = user.two_factor_recovery_codes.indexOf(token);
      if (idx !== -1) {
        isRecovery = true;
        user.two_factor_recovery_codes.splice(idx, 1);
        await pool.query(
          "UPDATE users SET two_factor_recovery_codes = $1 WHERE id = $2",
          [JSON.stringify(user.two_factor_recovery_codes), userId]
        );
      }
    }

    if (!isValid && !isRecovery) {
      return res.status(400).json({ message: "Invalid 2FA token or recovery code" });
    }

    // Update last login timestamp
    await pool.query(
      `UPDATE users SET last_login_at = now(), updated_at = now()
       WHERE id = $1`,
      [user.id]
    );

    // Fetch permissions
    const permissions = await authService.getUserPermissions(user.id, user.tenant_id, user.role);

    // Generate JWT + Refresh Token
    const tokens = await authService.generateTokens(user, rememberMe, permissions);

    return res.json({
      status: "success",
      role: user.role,
      tenantId: user.tenant_id,
      permissions,
      mustChangePassword: user.must_change_password,
      ...tokens
    });

  } catch (error) {
    console.error("VERIFY 2FA LOGIN ERROR:", error);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};
