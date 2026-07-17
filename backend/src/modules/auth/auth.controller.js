const authService = require("./auth.service");
const logger = require("../../config/logger");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../config/db");
const env = require("../../config/env");
const mailer = require("../../config/mailer");
const subscriptionService = require("../subscriptions/subscriptions.service");
const logAudit = require("../../utils/auditLogger");
let generateSecret, generateURI, verifySync;
try {
  const otplib = require("otplib");
  generateSecret = otplib.generateSecret;
  generateURI = otplib.generateURI;
  verifySync = otplib.verifySync;
} catch (err) {
  logger.error("otplib not available, TOTP disabled:", err.message);
  generateSecret = () => crypto.randomBytes(20).toString("hex").toUpperCase();
  generateURI = () => "";
  verifySync = () => false;
}
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

async function incrementLoginAttempts(userId) {
  await pool.query(
    `UPDATE users 
     SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
         locked_until = CASE 
           WHEN COALESCE(failed_login_attempts, 0) + 1 >= $1 
           THEN now() + make_interval(mins => $2)
           ELSE locked_until
         END
     WHERE id = $3`,
    [MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES, userId]
  );
}

async function resetLoginAttempts(userId) {
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [userId]
  );
}

async function isAccountLocked(userId) {
  const res = await pool.query(
    `SELECT locked_until FROM users WHERE id = $1`,
    [userId]
  );
  if (res.rowCount === 0) return false;
  const lockedUntil = res.rows[0].locked_until;
  return lockedUntil && new Date(lockedUntil) > new Date();
}

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
          u.failed_login_attempts,
          u.locked_until,
          u.last_login_at,
          e.id AS employee_id,
          t.is_active AS tenant_is_active,
          t.plan_type,
          t.plan_expiry_date
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

    // Check account lockout
    if (user.failed_login_attempts && user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS) {
      if (await isAccountLocked(user.id)) {
        return res.status(429).json({ 
          message: "Account temporarily locked due to too many failed attempts. Try again later." 
        });
      }
    }

    // Validate tenant status first (unless super admin)
    if (user.role !== 'SUPER_ADMIN') {
      if (user.tenant_id) {
        // 1. Check if plan is expired
        const now = new Date();
         if (user.plan_expiry_date && new Date(user.plan_expiry_date) < now) {
            return res.status(403).json({ 
              message: "Subscription Expired", 
              planExpired: true,
              detail: "Your organization subscription has expired. Please renew your plan to continue." 
            });
        }

        // 2. Check if organization is explicitly inactive
        if (user.tenant_is_active === false) {
           // Check if there's a pending payment subscription
           try {
             const sub = await subscriptionService.getSubscriptionByTenantId(user.tenant_id);
             if (sub && (sub.status === 'PENDING_PAYMENT' || sub.status === 'PAST_DUE' || sub.status === 'UNPAID')) {
               return res.status(403).json({ 
                 message: "Payment Required", 
                 paymentPending: true,
                 detail: "Your organization subscription setup is incomplete. Please complete the payment."
               });
             }
           } catch (subErr) {
             logger.error("Error checking subscription during login", { err: subErr });
           }
           return res.status(403).json({ 
             message: "Organization Inactive", 
             detail: "Your organization account is currently inactive. Please contact support." 
           });
        }
      }
    }

    if (!user.is_active) {
      return res.status(403).json({ 
        message: "Account Inactive",
        detail: "Your personal user account has been deactivated. Please contact your HR administrator."
      });
    }

    // Validate password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await incrementLoginAttempts(user.id);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check account lockout (after password validation to avoid user enumeration)
    if (await isAccountLocked(user.id)) {
      return res.status(429).json({ 
        message: "Account temporarily locked due to too many failed attempts. Try again later." 
      });
    }

    // Reset failed attempts on successful login
    await resetLoginAttempts(user.id);

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      // Return a minimal pre-auth token - only id and type
      const preAuthToken = jwt.sign(
        {
          id: user.id,
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

    // Generate JWT + Refresh Token
    const tokens = await authService.generateTokens(user, rememberMe);

    // Audit Login (Async, don't await)
    const mockReq = { ...req, user: { tenantId: user.tenant_id, userId: user.id } };
    logAudit(mockReq, 'users', user.id, 'LOGIN', null, { ip: req.ip }).catch(e => logger.error(e));

    return res.json({
      status: "success",
      role: user.role,
      tenantId: user.tenant_id,
      planType: user.plan_type || 1,
      mustChangePassword: user.must_change_password,
      ...tokens
    });

  } catch (error) {
    logger.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const session = await authService.verifyRefreshToken(refresh_token, req.ip, req.headers["user-agent"]);
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
        employeeId: user.employee_id,
        sessionId: session.id // Include session ID for verification
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN || "15m" }
    );

    const newRefreshToken = crypto.randomBytes(48).toString("hex");

    const rotated = await authService.updateSessionActivity(refresh_token, newRefreshToken);
    if (!rotated) {
      // Token was already rotated or revoked — possible token theft
      await authService.revokeRefreshToken(refresh_token);
      await authService.revokeRefreshToken(newRefreshToken);
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    return res.json({
      status: "success",
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    logger.error("REFRESH TOKEN ERROR:", error);
    return res.status(401).json({ message: "Refresh failed. Please login again." });
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
      logAudit(req, 'users', req.user.id, 'LOGOUT', null, null).catch(e => logger.error(e));
    }

    return res.json({ status: "success", message: "Logged out successfully" });

  } catch (error) {
    logger.error("LOGOUT ERROR:", error);
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
    logger.error("LOGOUT OTHER DEVICES ERROR:", error);
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
    logger.error("LIST SESSIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};


// ========================================================================
// FORGOT PASSWORD
// ========================================================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check for recent reset request for this email (rate limit: 1 per 60s)
    const recentRes = await pool.query(
      `SELECT id FROM password_resets 
       WHERE email = $1 AND created_at > now() - interval '60 seconds'`,
      [email.toLowerCase()]
    );
    if (recentRes.rowCount > 0) {
      return res.status(429).json({ 
        message: "Password reset email already sent. Please wait before requesting another." 
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    // Invalidate all previous password reset tokens for this email
    await pool.query(`DELETE FROM password_resets WHERE email = $1`, [email.toLowerCase()]);

    await pool.query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES ($1, $2, now() + interval '15 minutes')`,
      [email.toLowerCase(), token]
    );

    try {
      await mailer.sendPasswordResetEmail(email, token);
    } catch (mailErr) {
      logger.error("Email sending failed:", mailErr);
    }

    return res.json({
      status: "success",
      message: "Password reset email sent"
    });

  } catch (error) {
    logger.error("FORGOT PASSWORD ERROR:", error);
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

    // 2. Hash token for constant-time lookup (prevent timing attacks)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Check reset token (using hashed comparison)
    const row = await pool.query(
      `SELECT email, token FROM password_resets 
       WHERE token = $1 AND expires_at > now()`,
      [token]
    );

    if (row.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Verify token hash matches (constant-time)
    const storedToken = row.rows[0].token;
    const storedTokenHash = crypto.createHash('sha256').update(storedToken).digest('hex');
    
    // Use timing-safe comparison
    if (tokenHash !== storedTokenHash) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = row.rows[0].email;

    // 4. Hash password safely
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 5. Update user's password
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

    // 6. Delete ALL reset tokens for this email (prevent reuse)
    await pool.query(`DELETE FROM password_resets WHERE email = $1`, [email]);

    return res.json({
      status: "success",
      message: "Password updated successfully"
    });

  } catch (error) {
    logger.error("RESET PASSWORD ERROR:", error);
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

    const row = await pool.query(
      `SELECT email, password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (row.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = row.rows[0];

    // Validate old password FIRST (before checking if new == current)
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    // Check if new password equals current password (after validation to avoid timing leak)
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password cannot be the same as current password" });
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

    // Send notification email
    try {
      await mailer.sendPasswordChangedNotification(user.email);
    } catch (mailErr) {
      logger.error("Failed to send password change notification:", mailErr);
      // Don't fail the request if email fails, but log it
    }

    return res.json({
      status: "success",
      message: "Password changed successfully"
    });

  } catch (error) {
    logger.error("CHANGE PASSWORD ERROR:", error);
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
    const QRCode = require("qrcode");
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
    logger.error("SETUP 2FA ERROR:", error);
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

    // Generate recovery codes and hash them before storing
    const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex"));
    const hashedCodes = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, 10)));

    await pool.query(
      "UPDATE users SET two_factor_enabled = true, two_factor_recovery_codes = $1 WHERE id = $2",
      [JSON.stringify(hashedCodes), userId]
    );

    return res.json({
      status: "success",
      message: "2FA enabled successfully",
      recoveryCodes
    });
  } catch (error) {
    logger.error("ENABLE 2FA ERROR:", error);
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
    logger.error("DISABLE 2FA ERROR:", error);
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
    logger.error("VERIFY PASSWORD ERROR:", error);
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
      `SELECT u.*, e.id AS employee_id, t.plan_type FROM users u 
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    const isValid = verifySync({ token, secret: user.two_factor_secret });

    // Check recovery codes if token fails - use bcrypt.compare for timing safety
    let isRecovery = false;
    if (!isValid && user.two_factor_recovery_codes) {
      for (let i = 0; i < user.two_factor_recovery_codes.length; i++) {
        const match = await bcrypt.compare(token, user.two_factor_recovery_codes[i]);
        if (match) {
          isRecovery = true;
          // Remove used recovery code
          user.two_factor_recovery_codes.splice(i, 1);
          await pool.query(
            "UPDATE users SET two_factor_recovery_codes = $1 WHERE id = $2",
            [JSON.stringify(user.two_factor_recovery_codes), userId]
          );
          break;
        }
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

    // Generate tokens
    user.ip = req.ip;
    user.ua = req.headers["user-agent"];
    const tokens = await authService.generateTokens(user, rememberMe);

    return res.json({
      status: "success",
      role: user.role,
      tenantId: user.tenant_id,
      planType: user.plan_type || 1,
      mustChangePassword: user.must_change_password,
      ...tokens
    });

  } catch (error) {
    logger.error("VERIFY 2FA LOGIN ERROR:", error);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};
