
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mailer = require("../../config/mailer");
const subscriptionService = require("../subscriptions/subscriptions.service");
const logger = require("../../config/logger");

const getDbFromReq = (req) => {
  if (req && req.dbClient) {
    return { query: req.dbClient.query.bind(req.dbClient), client: req.dbClient, usingReqClient: true };
  }
  return { query: pool.query.bind(pool), client: null, usingReqClient: false };
}

/**
 * Check if a subdomain (workspace name) is already taken
 */
exports.checkDomainAvailability = async (subdomain) => {
    if (!subdomain) return { available: false, message: "Subdomain is required" };
    
    const cleanSubdomain = subdomain.trim().toLowerCase();
    
    // Check in tenants table
    const result = await pool.query(
        "SELECT id FROM tenants WHERE LOWER(domain) = $1 LIMIT 1",
        [cleanSubdomain]
    );
    
    if (result.rowCount > 0) {
        return { available: false, message: "This workspace name is already taken" };
    }
    
    return { available: true };
};

/**
 * Check if an email is already registered
 */
exports.checkEmailAvailability = async (email) => {
    if (!email) return { available: false, message: "Email is required" };
    const cleanEmail = email.trim().toLowerCase();

    // Check in tenants table
    const tenantResult = await pool.query(
        "SELECT id FROM tenants WHERE LOWER(email) = $1 AND is_active = true LIMIT 1",
        [cleanEmail]
    );
    if (tenantResult.rowCount > 0) {
        return { available: false, message: "This email is already registered with an active workspace" };
    }

    // Check in users table
    const userResult = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = $1 AND is_deleted = false LIMIT 1",
        [cleanEmail]
    );
    if (userResult.rowCount > 0) {
        return { available: false, message: "This email is already in use by another account" };
    }

    return { available: true };
};

// ========================================================================
// OTP VERIFICATION FUNCTIONS
// ========================================================================

/**
 * Send OTP to email for verification
 */
exports.sendVerificationOtp = async (email, domain, phone) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists in tenants AND is fully active
    const emailDup = await pool.query(
        `SELECT id, is_active FROM tenants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [cleanEmail]
    );
    if (emailDup.rowCount > 0 && emailDup.rows[0].is_active) {
        throw new Error("A tenant with this email already exists and is active");
    }

    // Check if email already exists in users (globally unique)
    const userEmailDup = await pool.query(
        `SELECT id, is_active FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = false LIMIT 1`,
        [cleanEmail]
    );
    if (userEmailDup.rowCount > 0 && userEmailDup.rows[0].is_active) {
        throw new Error("This email address is already registered and active in the system");
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Use ON CONFLICT to update existing code if it exists
    await pool.query(
        `INSERT INTO email_verifications (email, code, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE 
         SET code = $2, expires_at = $3, verified = false, created_at = NOW()`,
        [cleanEmail, code, expiresAt]
    );

    // Send email
    try {
        await mailer.sendVerificationOTP(email, code);
        logger.info("Verification OTP sent", { email: cleanEmail });
    } catch (err) {
        logger.error("Failed to send verification OTP", { email: cleanEmail, err });
        throw new Error("Failed to send verification email");
    }

    return { message: "OTP sent successfully" };
};

exports.verifyOtp = async (email, code) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const result = await pool.query(
    `SELECT id FROM email_verifications 
     WHERE email = $1 AND code = $2 AND expires_at > NOW() AND verified = false
     LIMIT 1`,
    [cleanEmail, cleanCode]
  );

  if (result.rowCount === 0) {
    throw new Error("Invalid or expired verification code");
  }

  await pool.query(
    "UPDATE email_verifications SET verified = true WHERE email = $1",
    [cleanEmail]
  );

  return { verified: true };
};

exports.checkEmailVerified = async (email) => {
  const cleanEmail = email.trim().toLowerCase();
  const result = await pool.query(
    "SELECT id FROM email_verifications WHERE email = $1 AND verified = true LIMIT 1",
    [cleanEmail]
  );
  return result.rowCount > 0;
};

exports.registerTenant = async (data, req = null) => {
    const { client: reqClient } = getDbFromReq(req);
    const client = reqClient || await pool.connect();
    const shouldRelease = !reqClient;

    try {
        await client.query("BEGIN");

        const cleanEmail = data.email.trim().toLowerCase();

        // 1. CLEANUP PREVIOUS FAILED ATTEMPTS
        // If a tenant exists but has no active user, or is not active, we clean it up
        const existingInactive = await client.query(
            `SELECT id FROM tenants WHERE LOWER(email) = LOWER($1) AND is_active = false LIMIT 1`,
            [cleanEmail]
        );

        if (existingInactive.rowCount > 0) {
            const oldId = existingInactive.rows[0].id;
            logger.info(`Cleaning up existing inactive tenant ${oldId} for retry...`);
            await client.query('DELETE FROM users WHERE tenant_id = $1', [oldId]);
            await client.query('DELETE FROM subscription_payments WHERE tenant_id = $1', [oldId]);
            await client.query('DELETE FROM subscription_invoices WHERE tenant_id = $1', [oldId]);
            await client.query('DELETE FROM subscriptions WHERE tenant_id = $1', [oldId]);
            await client.query('DELETE FROM tenants WHERE id = $1', [oldId]);
        }

        // 2. DUPLICATE CHECK
        const userEmailDup = await client.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true AND is_deleted = false LIMIT 1", 
            [cleanEmail]
        );
        if (userEmailDup.rowCount > 0) throw new Error("This email address is already registered as an active user.");

        if (data.domain) {
            const domainDup = await client.query(
                "SELECT id FROM tenants WHERE domain = $1 AND is_active = true LIMIT 1",
                [data.domain]
            );
            if (domainDup.rowCount > 0) throw new Error("A tenant with this domain already exists and is active.");
        }

        // 3. CREATE TENANT
        const isPaidPlan = !!data.plan_id;
        const tenantInsert = await client.query(
            `INSERT INTO tenants (name, domain, phone, address, city, state, country, zip_code, email, employee_count, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, name, email`,
            [
                data.name, 
                data.domain || null, 
                data.phone || null, 
                data.address || null, 
                data.city || null, 
                data.state || null, 
                data.country || null, 
                data.zip_code || null, 
                cleanEmail,
                data.employee_count || 1,
                !isPaidPlan // Trials start active
            ]
        );
        const tenant = tenantInsert.rows[0];

        // 4. SEED ROLE PERMISSIONS
        await client.query("SELECT seed_role_permissions_for_tenant($1)", [tenant.id]);

        // 5. CREATE ADMIN USER
        const tempPassword = crypto.randomBytes(6).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        const userInsert = await client.query(
            `INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
             VALUES ($1, $2, $3, 'ADMIN', $4, true)
             RETURNING id, email, role`,
            [tenant.id, cleanEmail, passwordHash, !isPaidPlan]
        );
        const user = userInsert.rows[0];

        // 6. INITIALIZE SUBSCRIPTION
        const couponToApply = data.coupon || data.coupon_code || null;
        if (isPaidPlan) {
            await subscriptionService.createPendingSubscription(
                tenant.id, client, data.plan_id, data.billing_cycle || 'MONTHLY', couponToApply
            );
        } else {
            await subscriptionService.createTrial(tenant.id, client, null, 'MONTHLY');
        }

        await client.query("COMMIT");

        // 7. POST-COMMIT ACTIONS (External API calls and Emails)
        let paymentData = null;
        if (isPaidPlan) {
            try {
                paymentData = await subscriptionService.initiateSubscription(
                    tenant.id, data.plan_id, data.billing_cycle || 'MONTHLY', data.employee_count || 1, couponToApply
                );
            } catch (payErr) {
                logger.error("Payment initiation failed after registration completion", { err: payErr.message, tenantId: tenant.id });
                // We don't rollback here since the tenant is already created as inactive. 
                // The user can retry payment from a completion page.
            }
        } else {
            // Send welcome email only for trials (for paid plans, we send it after payment)
            try {
                await mailer.sendWelcomeEmail(user.email, tenant.name, tempPassword);
            } catch (mailErr) {
                logger.error("Failed to send welcome email for trial", { err: mailErr.message });
            }
        }

        return { 
            tenant, 
            adminUser: user, 
            paymentRequired: isPaidPlan, 
            paymentData 
        };

    } catch (err) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        logger.error("Registration failed", { error: err.message });
        throw err;
    } finally {
        if (shouldRelease && client) client.release();
    }
};

exports.getEmployeeIdSettings = async (tenantId) => {
  const result = await pool.query("SELECT settings FROM tenants WHERE id = $1", [tenantId]);
  if (result.rowCount === 0) throw new Error("Tenant not found");
  return result.rows[0].settings || {};
};

exports.setEmployeeIdPrefix = async (tenantId, prefix) => {
  await pool.query(
    "UPDATE tenants SET settings = jsonb_set(COALESCE(settings, '{}'), '{employee_id_prefix}', $1) WHERE id = $2",
    [JSON.stringify(prefix), tenantId]
  );
  return { prefix };
};

exports.toggleEmployeeIdMode = async (tenantId, usePrefix) => {
  await pool.query(
    "UPDATE tenants SET settings = jsonb_set(COALESCE(settings, '{}'), '{use_employee_id_prefix}', $1) WHERE id = $2",
    [JSON.stringify(usePrefix), tenantId]
  );
  return { usePrefix };
};
