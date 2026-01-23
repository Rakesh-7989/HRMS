
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
    zip_code: data.zip_code || null,
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

  // duplicate check (domain || email || phone)
  const dupClient = client || (await pool.connect());
  let releaseDup = !usingReqClient && !client;

  try {
    const dupRes = await dupClient.query(
      `
      SELECT id FROM tenants
      WHERE 
        (domain IS NOT NULL AND domain = $1)
        OR (email IS NOT NULL AND email = $2)
        OR (phone IS NOT NULL AND phone = $3)
      LIMIT 1
      `,
      [tenantFields.domain, tenantFields.email, tenantFields.phone]
    );

    if (dupRes.rowCount > 0) {
      throw new Error("Tenant with same domain, email, or phone already exists");
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
        VALUES ($1,$2,$3,'ADMIN',true,false,$4)
        RETURNING id, email, role
        `,
        [tenant.id, tenant.email, passwordHash, null]
      );

      const user = userInsert.rows[0];

      // Create trial subscription
      await subscriptionService.createTrial(tenant.id, client);

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

    // Create trial subscription
    await subscriptionService.createTrial(tenant.id, c);

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
