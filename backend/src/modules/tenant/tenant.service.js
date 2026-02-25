
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mailer = require("../../config/mailer");
const logger = require("../../config/logger");
const subscriptionService = require("../subscriptions/subscriptions.service");

function getDbFromReq(req) {
  if (req && req.db && typeof req.db.query === "function") {
    return { query: req.db.query.bind(req.db), client: req.db.client || null, usingReqClient: !!req.db.client };
  }
  return { query: pool.query.bind(pool), client: null, usingReqClient: false };
}

// ========================================================================
// OTP VERIFICATION FUNCTIONS
// ========================================================================

/**
 * Send OTP to email for verification
 */
exports.sendVerificationOtp = async (email, domain, phone) => {
  // Check if email already exists in tenants
  const emailDup = await pool.query(
    `SELECT id FROM tenants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );
  if (emailDup.rowCount > 0) {
    throw new Error("A tenant with this email already exists");
  }

  // Check if email already exists in users (globally unique)
  const userEmailDup = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = false LIMIT 1`,
    [email]
  );
  if (userEmailDup.rowCount > 0) {
    throw new Error("This email address is already registered in the system");
  }

  // Check domain duplicate if provided
  if (domain) {
    const domainDup = await pool.query(
      `SELECT id FROM tenants WHERE domain = $1 LIMIT 1`,
      [domain]
    );
    if (domainDup.rowCount > 0) {
      throw new Error("A tenant with this domain already exists");
    }
  }

  // Check phone duplicate if provided
  if (phone) {
    const phoneDup = await pool.query(
      `SELECT id FROM tenants WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    if (phoneDup.rowCount > 0) {
      throw new Error("A tenant with this phone number already exists");
    }
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete old codes for this email
  await pool.query(
    `DELETE FROM email_verifications WHERE email = $1`,
    [email]
  );

  // Insert new code
  await pool.query(
    `INSERT INTO email_verifications (email, code, expires_at)
     VALUES ($1, $2, $3)`,
    [email, code, expiresAt]
  );

  // Send email
  try {
    await mailer.sendVerificationOTP(email, code);
    logger.info("Verification OTP sent", { email });
  } catch (err) {
    logger.error("Failed to send verification OTP", { email, err });
    throw new Error("Failed to send verification email");
  }

  return { message: "OTP sent successfully" };
};

/**
 * Verify OTP code
 */
exports.verifyOtp = async (email, code) => {
  const result = await pool.query(
    `SELECT id FROM email_verifications 
     WHERE email = $1 AND code = $2 AND expires_at > NOW() AND verified = false
     LIMIT 1`,
    [email, code]
  );

  if (result.rowCount === 0) {
    throw new Error("Invalid or expired verification code");
  }

  // Mark as verified
  await pool.query(
    `UPDATE email_verifications SET verified = true WHERE id = $1`,
    [result.rows[0].id]
  );

  return { verified: true };
};

/**
 * Check if email is verified (within last 30 minutes)
 */
exports.checkEmailVerified = async (email) => {
  const result = await pool.query(
    `SELECT id FROM email_verifications 
     WHERE email = $1 AND verified = true AND created_at > NOW() - INTERVAL '30 minutes'
     LIMIT 1`,
    [email]
  );

  return result.rowCount > 0;
};


exports.registerTenant = async (data, req = null) => {
  const { query, client, usingReqClient } = getDbFromReq(req);

  const tenantFields = {
    name: data.name,
    domain: data.domain || null,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || null,
    zip_code: data.zip_code ? String(data.zip_code) : null,
    email: data.email,
    settings: data.settings || {}
  };

  // Validate phone number if provided
  if (tenantFields.phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(tenantFields.phone)) {
      throw new Error("Invalid phone number format. Please use only digits, spaces, hyphens, +, (, )");
    }
    const digitsOnly = tenantFields.phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      throw new Error("Phone number must contain at least 10 digits");
    }
  }

  // duplicate check - check each field individually for specific error messages
  const dupClient = client || (await pool.connect());
  let releaseDup = !usingReqClient && !client;

  try {
    // Check email duplicate in tenants table
    const emailDup = await dupClient.query(
      `SELECT id FROM tenants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [tenantFields.email]
    );
    if (emailDup.rowCount > 0) {
      throw new Error("A tenant with this email already exists");
    }

    // Check email duplicate in users table (globally unique email)
    const userEmailDup = await dupClient.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = false LIMIT 1`,
      [tenantFields.email]
    );
    if (userEmailDup.rowCount > 0) {
      throw new Error("This email address is already registered in the system");
    }

    // Check domain duplicate (only if domain is provided)
    if (tenantFields.domain) {
      const domainDup = await dupClient.query(
        `SELECT id FROM tenants WHERE domain = $1 LIMIT 1`,
        [tenantFields.domain]
      );
      if (domainDup.rowCount > 0) {
        throw new Error("A tenant with this domain already exists");
      }
    }

    // Check phone duplicate (only if phone is provided)
    if (tenantFields.phone) {
      const phoneDup = await dupClient.query(
        `SELECT id FROM tenants WHERE phone = $1 LIMIT 1`,
        [tenantFields.phone]
      );
      if (phoneDup.rowCount > 0) {
        throw new Error("A tenant with this phone number already exists");
      }
    }
  } finally {
    if (releaseDup) dupClient.release();
  }

  const tempPassword = crypto.randomBytes(6).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // transaction handling
  if (usingReqClient && client) {
    try {
      await client.query("BEGIN");

      const tenantInsert = await client.query(
        `
        INSERT INTO tenants
          (name, domain, phone, address, city, state, country, zip_code, email, settings, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, name, email
        `,
        [
          tenantFields.name,
          tenantFields.domain,
          tenantFields.phone,
          tenantFields.address,
          tenantFields.city,
          tenantFields.state,
          tenantFields.country,
          tenantFields.zip_code,
          tenantFields.email,
          tenantFields.settings,
          null
        ]
      );

      const tenant = tenantInsert.rows[0];

      const userInsert = await client.query(
        `
        INSERT INTO users
          (tenant_id, email, password_hash, role, is_active, must_change_password, created_by)
        VALUES ($1,$2,$3,'ADMIN',true,true,$4)
        RETURNING id, email, role
        `,
        [tenant.id, tenant.email, passwordHash, null]
      );

      const user = userInsert.rows[0];

      // Create subscription - trial if no plan selected, pending payment if plan selected
      if (data.plan_id) {
        // User selected a specific plan - create pending subscription awaiting payment
        await subscriptionService.createPendingSubscription(tenant.id, client, data.plan_id, data.billing_cycle || 'MONTHLY');
      } else {
        // No plan selected - create trial subscription
        await subscriptionService.createTrial(tenant.id, client, null, 'MONTHLY');
      }

      await client.query("COMMIT");

      try {
        if (typeof mailer.sendWelcomeEmail === "function") {
          await mailer.sendWelcomeEmail(user.email, tenant.name, tempPassword);
        } else {
          logger.warn("No welcome email function found in mailer");
        }
      } catch (mailErr) {
        logger.error("Failed to send welcome email", { err: mailErr });
      }

      return { tenant, adminUser: user };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    }
  }

  // fallback path with pool client
  const c = await pool.connect();
  try {
    await c.query("BEGIN");

    const tenantInsert = await c.query(
      `
      INSERT INTO tenants
        (name, domain, phone, address, city, state, country, zip_code, email, settings, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, name, email
      `,
      [
        tenantFields.name,
        tenantFields.domain,
        tenantFields.phone,
        tenantFields.address,
        tenantFields.city,
        tenantFields.state,
        tenantFields.country,
        tenantFields.zip_code,
        tenantFields.email,
        tenantFields.settings,
        null
      ]
    );

    const tenant = tenantInsert.rows[0];

    const userInsert = await c.query(
      `
      INSERT INTO users
        (tenant_id, email, password_hash, role, is_active, must_change_password, created_by)
      VALUES ($1,$2,$3,'ADMIN',true,true,$4)
      RETURNING id, email, role
      `,
      [tenant.id, tenant.email, passwordHash, null]
    );

    const user = userInsert.rows[0];

    // Create subscription - trial if no plan selected, pending payment if plan selected
    if (data.plan_id) {
      // User selected a specific plan - create pending subscription awaiting payment
      await subscriptionService.createPendingSubscription(tenant.id, client, data.plan_id, data.billing_cycle || 'MONTHLY', data.coupon_code || null);
    } else {
      // No plan selected - create trial subscription
      await subscriptionService.createTrial(tenant.id, c, null, 'MONTHLY');
    }

    await c.query("COMMIT");

    try {
      if (typeof mailer.sendWelcomeEmail === "function") {
        await mailer.sendWelcomeEmail(user.email, tenant.name, tempPassword);
      } else {
        logger.warn("No welcome email function found in mailer");
      }
    } catch (mailErr) {
      logger.error("Failed to send welcome email", { err: mailErr });
    }

    return { tenant, adminUser: user };
  } catch (err) {
    await c.query("ROLLBACK").catch(() => { });
    throw err;
  } finally {
    c.release();
  }
};

// ========================================================================
// EMPLOYEE ID SETTINGS FUNCTIONS
// ========================================================================

/**
 * Get employee ID settings for a tenant
 */
exports.getEmployeeIdSettings = async (tenantId) => {
  const result = await pool.query(
    `SELECT settings FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error("Tenant not found");
  }

  const settings = result.rows[0].settings || {};
  const prefix = settings.employee_id_prefix || null;
  const counter = settings.employee_id_counter || 0;
  // Default to true for backward compatibility
  const usePrefix = settings.use_employee_id_prefix !== false;

  // Generate next ID preview
  let nextId = null;
  if (prefix) {
    const nextNumber = counter + 1;
    nextId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  return {
    prefix,
    counter,
    nextId,
    usePrefix,
    isConfigured: usePrefix ? !!prefix : true
  };
};

/**
 * Set employee ID prefix for a tenant (one-time only)
 */
exports.setEmployeeIdPrefix = async (tenantId, prefix) => {
  // Validate prefix format (2-5 uppercase letters)
  if (!prefix || !/^[A-Z]{2,5}$/.test(prefix)) {
    throw new Error("Prefix must be 2-5 uppercase letters");
  }

  // Check if prefix is already set
  const current = await pool.query(
    `SELECT settings FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (current.rowCount === 0) {
    throw new Error("Tenant not found");
  }

  const settings = current.rows[0].settings || {};
  const currentCounter = settings.employee_id_counter || 0;

  if (settings.employee_id_prefix && currentCounter > 0) {
    throw new Error("Employee ID prefix is already in use and cannot be changed");
  }

  // Check if prefix is already used by another tenant
  // Note: We need to check inside result -> settings -> employee_id_prefix
  // Since settings is JSONB, we can query it directly
  const duplicateCheck = await pool.query(
    `SELECT id FROM tenants WHERE settings->>'employee_id_prefix' = $1 LIMIT 1`,
    [prefix]
  );

  if (duplicateCheck.rowCount > 0) {
    throw new Error(`Prefix '${prefix}' is already in use by another organization. Please choose a different one.`);
  }

  // Set the prefix and initialize counter to 0
  const newSettings = {
    ...settings,
    employee_id_prefix: prefix,
    employee_id_counter: 0
  };

  await pool.query(
    `UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(newSettings), tenantId]
  );

  return {
    prefix,
    nextId: `${prefix}001`,
    message: "Employee ID prefix configured successfully"
  };
};

/**
 * Toggle employee ID mode (prefix auto-generation vs manual entry)
 */
exports.toggleEmployeeIdMode = async (tenantId, usePrefix) => {
  const result = await pool.query(
    `SELECT settings FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error("Tenant not found");
  }

  const settings = result.rows[0].settings || {};

  // If turning ON prefix mode and no prefix is set, inform user
  if (usePrefix && !settings.employee_id_prefix) {
    // Just toggle the flag, prefix can be set separately
  }

  const newSettings = {
    ...settings,
    use_employee_id_prefix: usePrefix
  };

  await pool.query(
    `UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(newSettings), tenantId]
  );

  return {
    usePrefix,
    message: usePrefix
      ? "Employee ID mode set to auto-generate with prefix"
      : "Employee ID mode set to manual entry"
  };
};

/**
 * Generate next employee ID (atomically increment counter)
 * This should be called within a transaction when creating an employee
 */
exports.generateNextEmployeeId = async (tenantId, client = null) => {
  const executor = client || pool;

  // 1. First check settings without locking
  const checkRes = await executor.query(
    `SELECT settings FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (checkRes.rowCount === 0) {
    throw new Error("Tenant not found");
  }

  const initialSettings = checkRes.rows[0].settings || {};
  const usePrefix = initialSettings.use_employee_id_prefix !== false; // Default to true

  // If manual mode, return null immediately (no lock needed)
  if (!usePrefix) {
    return null;
  }

  // 2. If auto-mode, re-fetch with lock to safely increment
  const result = await executor.query(
    `SELECT settings FROM tenants WHERE id = $1 FOR UPDATE`,
    [tenantId]
  );

  const settings = result.rows[0].settings || {};
  const prefix = settings.employee_id_prefix;

  if (!prefix) {
    throw new Error("Employee ID prefix not configured. Please set the prefix first.");
  }

  const currentCounter = settings.employee_id_counter || 0;
  const newCounter = currentCounter + 1;

  // Update the counter
  const newSettings = {
    ...settings,
    employee_id_counter: newCounter
  };

  await executor.query(
    `UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(newSettings), tenantId]
  );

  // Generate the employee ID (e.g., AM001, AM010, AM100)
  const employeeId = `${prefix}${String(newCounter).padStart(3, '0')}`;

  return employeeId;
};
