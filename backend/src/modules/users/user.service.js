const pool = require("../../config/db");
const { query: dbQuery, queryRLS } = require("../../middleware/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const XLSX = require("xlsx");
const mailer = require("../../config/mailer");
const logger = require("../../config/logger");
const subscriptionService = require("../subscriptions/subscriptions.service");
const tenantService = require("../tenant/tenant.service");
const { encrypt, decrypt, encryptFields, decryptFields, decryptAndMaskFields, canRevealField, SENSITIVE_FIELDS, FIELD_CONFIG } = require("../../utils/encryption");
const inboxService = require("../inbox/inbox.service");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : dbQuery;

/* ---------- DUPLICATE CHECK FOR ENCRYPTED FIELDS ---------- */
// Since encrypted values use random IVs, DB UNIQUE constraints don't work.
// This decrypts existing values and compares at the application level.
const UNIQUE_FIELDS = [
  { field: 'phone', label: 'Phone Number' },
  { field: 'aadhar_number', label: 'Aadhaar Number' },
  { field: 'tax_id', label: 'Tax ID (PAN)' },
  { field: 'account_number', label: 'Account Number' },
  { field: 'uan', label: 'UAN' },
  { field: 'pf_account', label: 'PF Account Number' },
  { field: 'esi_number', label: 'ESI Number' },
];

async function checkEncryptedDuplicates(client, tenantId, data, excludeUserId = null) {
  for (const { field, label } of UNIQUE_FIELDS) {
    const value = data[field];
    if (!value || !String(value).trim()) continue;

    const plainValue = String(value).trim();

    let sql = `SELECT user_id, ${field} FROM employees WHERE tenant_id = $1 AND ${field} IS NOT NULL`;
    const params = [tenantId];

    if (excludeUserId) {
      sql += ` AND user_id != $2`;
      params.push(excludeUserId);
    }

    const { rows } = await client.query(sql, params);

    for (const row of rows) {
      try {
        const existingValue = decrypt(row[field]);
        if (existingValue === plainValue) {
          throw new Error(`${label} "${plainValue}" is already assigned to another employee`);
        }
      } catch (err) {
        if (err.message.includes('already assigned')) throw err;
        // If decryption fails (old plaintext data), compare directly
        if (row[field] === plainValue) {
          throw new Error(`${label} "${plainValue}" is already assigned to another employee`);
        }
      }
    }
  }
}

/* ---------- CIRCULAR REPORTING CHECK ---------- */
async function checkCircularReporting(client, employeeId, potentialManagerId, tenantId) {
  if (!potentialManagerId) return;
  if (employeeId === potentialManagerId) {
    throw new Error("An employee cannot report to themselves");
  }

  let currentId = potentialManagerId;
  const visited = new Set([employeeId]);

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Circular reporting detected: This would create an infinite loop in the organization hierarchy");
    }
    visited.add(currentId);

    const res = await client.query(
      "SELECT reports_to FROM employees WHERE id = $1 AND tenant_id = $2",
      [currentId, tenantId]
    );

    if (res.rowCount === 0) break;
    currentId = res.rows[0].reports_to;

    // Safety break for deep hierarchies
    if (visited.size > 50) break;
  }
}

/* ---------- REAL-TIME UNIQUENESS CHECK ---------- */
exports.checkFieldUniqueness = async (db, field, value, tenantId, excludeUserId = null) => {
  const query = getQuery(db);

  // Email check: simple query, no encryption
  if (field === 'email') {
    let sql = `SELECT id FROM users WHERE LOWER(email) = $1 AND is_deleted = false`;
    const params = [value.toLowerCase()];
    if (excludeUserId) {
      sql += ` AND id != $2`;
      params.push(excludeUserId);
    }
    const { rowCount } = await query(sql, params);
    return { exists: rowCount > 0 };
  }

  // For encrypted employee fields
  const allowed = UNIQUE_FIELDS.map(f => f.field);
  if (!allowed.includes(field)) {
    return { exists: false };
  }

  const label = UNIQUE_FIELDS.find(f => f.field === field)?.label || field;
  const plainValue = String(value).trim();
  if (!plainValue) return { exists: false };

  let sql = `SELECT user_id, ${field} FROM employees WHERE tenant_id = $1 AND ${field} IS NOT NULL`;
  const params = [tenantId];
  if (excludeUserId) {
    sql += ` AND user_id != $2`;
    params.push(excludeUserId);
  }

  const { rows } = await query(sql, params);
  for (const row of rows) {
    try {
      const existing = decrypt(row[field]);
      if (existing === plainValue) return { exists: true, label };
    } catch {
      if (row[field] === plainValue) return { exists: true, label };
    }
  }
  return { exists: false, label };
};

exports.createUser = async (db, data, actor, isSharedClient = false) => {
  const client = isSharedClient ? db : await pool.connect();

  try {
    await client.query("BEGIN");

    // SUPER_ADMIN can create anyone, ADMIN/HR have role restrictions
    if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) {
      throw new Error("Not allowed to create users");
    }

    // HR users can create EMPLOYEE, MANAGER and HR
    if (actor.role === "HR") {
      if (!["EMPLOYEE", "MANAGER", "HR"].includes(data.role)) {
        throw new Error("HR can only create EMPLOYEE, MANAGER or HR roles");
      }
    }

    // ADMIN can create EMPLOYEE, MANAGER, HR, ADMIN
    if (actor.role === "ADMIN") {
      if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(data.role)) {
        throw new Error("ADMIN can only create EMPLOYEE, MANAGER, HR, or ADMIN roles");
      }
    }

    // Only SUPER_ADMIN or ADMIN can create ADMIN role
    // [ADMIN LIMIT CHECK]
    if (data.role === 'ADMIN') {
      const tenantRes = await client.query('SELECT plan_type FROM tenants WHERE id = $1', [actor.tenantId]);
      const planType = tenantRes.rows[0]?.plan_type || 1;

      const adminCountRes = await client.query(
        'SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND is_deleted = false',
        [actor.tenantId, 'ADMIN']
      );
      const currentAdmins = parseInt(adminCountRes.rows[0].count, 10);

      const limits = { 1: 1, 2: 5, 3: 999999 }; // Standard: 1, Premium: 5, Elite: Unlimited
      if (currentAdmins >= limits[planType]) {
        throw new Error(`Your ${planType === 1 ? 'STANDARD' : 'PREMIUM'} plan is limited to ${limits[planType]} Admin user${limits[planType] > 1 ? 's' : ''}. Please upgrade to add more.`);
      }
    }

    // [CUSTOM ROLE CHECK]
    const systemRoles = ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"];
    if (!systemRoles.includes(data.role)) {
      const tenantRes = await client.query('SELECT plan_type FROM tenants WHERE id = $1', [actor.tenantId]);
      const planType = tenantRes.rows[0]?.plan_type || 1;
      if (planType === 1) {
        throw new Error("Custom roles are not available on the STANDARD plan. Please upgrade to PREMIUM or ELITE.");
      }
    }

    // Check employee limit
    const canAddMore = await subscriptionService.checkEmployeeLimit(actor.tenantId, client);
    if (!canAddMore) {
      throw new Error("Employee limit reached for your current subscription plan. Please upgrade to add more employees.");
    }

    // Check for globally unique email (across all tenants)
    const duplicate = await client.query(
      `SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND is_deleted = false`,
      [data.email]
    );
    if (duplicate.rowCount) {
      throw new Error("This email already exists in our system. Please use a different email address.");
    }
    // Determine employee ID
    let generatedEmployeeId;
    if (data.employee_id && data.employee_id.trim()) {
      generatedEmployeeId = data.employee_id.trim();
    } else {
      // Auto-generate employee ID using tenant's configured prefix
      try {
        generatedEmployeeId = await tenantService.generateNextEmployeeId(actor.tenantId, client);
        if (generatedEmployeeId === null) {
          throw new Error("Employee ID is required when auto-prefix is disabled. Please enter an employee ID.");
        }
      } catch (err) {
        throw new Error(err.message || "Failed to generate employee ID. Please configure the employee ID prefix first.");
      }
    }

    // Validate department belongs to same tenant
    if (data.department_id) {
      const deptCheck = await client.query(
        `SELECT id FROM departments WHERE id = $1 AND tenant_id = $2`,
        [data.department_id, actor.tenantId]
      );
      if (deptCheck.rowCount === 0) {
        throw new Error("Department not found or does not belong to your organization");
      }
    }

    // Validate designation belongs to same tenant
    if (data.designation_id) {
      const desigCheck = await client.query(
        `SELECT id FROM designations WHERE id = $1 AND tenant_id = $2`,
        [data.designation_id, actor.tenantId]
      );
      if (desigCheck.rowCount === 0) {
        throw new Error("Designation not found or does not belong to your organization");
      }
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const hash = await bcrypt.hash(tempPassword, 10);

    const userRes = await client.query(
      `
      INSERT INTO users 
        (tenant_id, email, password_hash, role, is_active, must_change_password, created_by)
      VALUES ($1,$2,$3,$4,true,true,$5)
      RETURNING id, email, role
      `,
      [actor.tenantId, data.email, hash, data.role, actor.id]
    );

    // Check for duplicate sensitive fields (phone, aadhar, PAN, account, etc.)
    await checkEncryptedDuplicates(client, actor.tenantId, data);

    // Encrypt sensitive fields before DB insert
    const encPhone = data.phone ? encrypt(data.phone) : null;
    const encEmergencyPhone = data.emergency_phone ? encrypt(data.emergency_phone) : null;
    const encAccountNumber = data.account_number ? encrypt(data.account_number) : null;
    const encIfscCode = data.ifsc_code ? encrypt(data.ifsc_code) : null;
    const encTaxId = data.tax_id ? encrypt(data.tax_id) : null;
    const encUan = data.uan ? encrypt(data.uan) : null;
    const encPfAccount = data.pf_account ? encrypt(data.pf_account) : null;
    const encEsiNumber = data.esi_number ? encrypt(data.esi_number) : null;
    const encAadharNumber = data.aadhar_number ? encrypt(data.aadhar_number) : null;

    const empRes = await client.query(
      `
      INSERT INTO employees
        (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, marital_status, nationality, 
         emergency_name, emergency_phone, emergency_relation,
         employee_id, department_id, designation_id, reports_to, join_date, employment_type, shift, shift_id,
         bank_name, account_name, account_number, ifsc_code, tax_id, address,
         uan, pf_account, esi_number, created_by, aadhar_number, annual_salary, branch_name, job_location, timezone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34, $35)
      RETURNING id
      `,
      [
        actor.tenantId,           // $1
        userRes.rows[0].id,       // $2
        data.first_name,          // $3
        data.last_name || null,   // $4
        encPhone,                 // $5 (encrypted)
        data.date_of_birth || null, // $6
        data.gender || null,      // $7
        data.marital_status || null, // $8
        data.nationality || null, // $9
        data.emergency_name || null, // $10
        encEmergencyPhone,        // $11 (encrypted)
        data.emergency_relation || null, // $12
        generatedEmployeeId,      // $13
        data.department_id || null, // $14
        data.designation_id || null, // $15
        data.reports_to || null,  // $16
        data.join_date || null,   // $17
        data.employment_type || null, // $18
        data.shift || null,       // $19
        data.shift_id || null,    // $20
        data.bank_name || null,   // $21
        data.account_name || null, // $22
        encAccountNumber,         // $23 (encrypted)
        encIfscCode,              // $24 (encrypted)
        encTaxId,                 // $25 (encrypted)
        data.address || null,     // $26
        encUan,                   // $27 (encrypted)
        encPfAccount,             // $28 (encrypted)
        encEsiNumber,             // $29 (encrypted)
        actor.id,                 // $30
        encAadharNumber,          // $31 (encrypted)
        data.ctc || 0,            // $32 (annual_salary)
        data.branch_name || null, // $33
        data.job_location || null, // $34
        data.timezone || null     // $35
      ]
    );


    // Create initial salary details if CTC is provided
    if (data.ctc) {
      // 1. Maintain legacy bank info support
      try {
        await client.query(
          `
          INSERT INTO employee_salary_details
            (tenant_id, employee_id, ctc, bank_name, bank_account_number, bank_ifsc, is_current, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, true, $7)
          `,
          [
            actor.tenantId,
            empRes.rows[0].id,
            data.ctc,
            data.bank_name || null,
            encAccountNumber,       // encrypted
            encIfscCode,            // encrypted
            actor.id
          ]
        );
      } catch (salaryError) {
        // Log but don't fail if table doesn't exist yet
        logger.warn("employee_salary_details check failed during onboarding", salaryError.message);
      }

      // 2. New Keka-style assignment
      try {
        const salaryStructureService = require("../payroll/salary/salaryStructure.service");
        const defaultStructure = await client.query(
          `SELECT id FROM salary_structures WHERE tenant_id = $1 AND is_default = TRUE AND is_active = TRUE`,
          [actor.tenantId]
        );

        if (defaultStructure.rowCount > 0) {
          await salaryStructureService.assignEmployeeSalary(
            actor.tenantId,
            empRes.rows[0].id,
            {
              structure_id: defaultStructure.rows[0].id,
              annual_ctc: parseFloat(data.ctc),
              effective_from: data.join_date || new Date().toISOString().split('T')[0],
              revision_reason: 'Initial assignment (Onboarding)'
            },
            actor.id,
            client
          );
        }
      } catch (err) {
        logger.error("Failed to assign initial salary structure in createUser:", err.message);
      }
    }

    await client.query("COMMIT");

    // Send welcome email
    mailer.sendWelcomeEmail(
      userRes.rows[0].email,
      data.first_name,
      tempPassword
    ).catch(err => logger.error("Email sending error:", err));

    // Welcome Notification
    try {
      await inboxService.createNotification(client, {
        tenant_id: actor.tenantId,
        user_id: userRes.rows[0].id,
        title: 'Welcome! 👋',
        message: `Welcome to the organization, ${data.first_name}! We're glad to have you here.`,
        type: 'info',
        link: '/profile'
      });
    } catch (notifErr) {
      console.error('Welcome notification error:', notifErr.message);
    }

    return {
      user: userRes.rows[0],
      employee: empRes.rows[0],
      temporaryPassword: tempPassword,
      _note: "Temporary password has been sent to user email"
    };

  } catch (err) {

    await client.query("ROLLBACK");
    // Handle database unique constraint violations
    if (err.code === '23505') {
      if (err.constraint === 'employees_employee_id_key' || err.message.includes('employee_id')) {
        throw new Error(`Employee ID "${data.employee_id}" is already assigned to another employee`);
      }
      if (err.constraint === 'users_email_per_tenant' || err.message.includes('email')) {
        throw new Error("An employee with this email address already exists in your organization");
      }
      if (err.constraint === 'employees_user_id_key') {
        throw new Error("This user is already linked to an employee record");
      }
      // General unique constraint message
      const field = err.detail?.match(/Key \((.*?)\)=/)?.[1] || "field";
      throw new Error(`The ${field.replace('_', ' ')} provided is already in use by another record`);
    }

    throw err;
  } finally {
    if (!isSharedClient) client.release();
  }
};


/* -------------------------- SOFT DELETE USER -------------------------- */
exports.softDeleteUser = async (db, id, actor) => {
  const query = getQuery(db);

  // Only ADMIN/SUPER_ADMIN can delete
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("Only admins can delete users");
  }

  // FINANCIAL INTEGRITY CHECK
  const empRes = await query("SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2", [id, actor.tenantId]);
  if (empRes.rowCount > 0) {
    const employeeId = empRes.rows[0].id;

    // Check for active loans
    const loanRes = await query(
      "SELECT id FROM employee_loans WHERE employee_id = $1 AND tenant_id = $2 AND status = 'APPROVED' AND outstanding_amount > 0",
      [employeeId, actor.tenantId]
    );
    if (loanRes.rowCount > 0) throw new Error("Employee has active loans. Please settle loans before deleting.");

    // Check for pending expenses
    const expRes = await query(
      "SELECT id FROM employee_expenses WHERE employee_id = $1 AND tenant_id = $2 AND status = 'PENDING' AND is_deleted = false",
      [employeeId, actor.tenantId]
    );
    if (expRes.rowCount > 0) throw new Error("Employee has pending expense claims. Please process or reject them first.");

    // Check for pending leaves
    const leaveRes = await query(
      "SELECT id FROM leave_applications WHERE employee_id = $1 AND tenant_id = $2 AND status IN ('PENDING', 'PENDING_HR')",
      [employeeId, actor.tenantId]
    );
    if (leaveRes.rowCount > 0) throw new Error("Employee has pending leave requests. Please approve or reject them before deleting.");
  }

  // Set is_deleted = true in both tables
  await query(
    `UPDATE users SET is_deleted = true, is_active = false, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
    [id, actor.tenantId]
  );

  await query(
    `UPDATE employees SET is_deleted = true, updated_at = now() WHERE user_id = $1 AND tenant_id = $2`,
    [id, actor.tenantId]
  );

  return { success: true, message: "User soft-deleted successfully" };
};

/* -------------------------- TERMINATE EMPLOYEE -------------------------- */
exports.terminateEmployee = async (db, id, data, actor) => {
  const query = getQuery(db);

  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) {
    throw new Error("Not allowed to terminate employees");
  }

  // FINANCIAL INTEGRITY CHECK
  const empCheck = await query("SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2", [id, actor.tenantId]);
  if (empCheck.rowCount > 0) {
    const employeeId = empCheck.rows[0].id;

    const loanRes = await query(
      "SELECT id FROM employee_loans WHERE employee_id = $1 AND tenant_id = $2 AND status = 'APPROVED' AND outstanding_amount > 0",
      [employeeId, actor.tenantId]
    );
    if (loanRes.rowCount > 0) throw new Error("Employee has active loans. Please settle loans before termination.");

    const expRes = await query(
      "SELECT id FROM employee_expenses WHERE employee_id = $1 AND tenant_id = $2 AND status = 'PENDING' AND is_deleted = false",
      [employeeId, actor.tenantId]
    );
    if (expRes.rowCount > 0) throw new Error("Employee has pending expense claims. Please process or reject them first.");

    // Check for pending leaves
    const leaveRes = await query(
      "SELECT id FROM leave_applications WHERE employee_id = $1 AND tenant_id = $2 AND status IN ('PENDING', 'PENDING_HR')",
      [employeeId, actor.tenantId]
    );
    if (leaveRes.rowCount > 0) throw new Error("Employee has pending leave requests. Please approve or reject them before termination.");
  }

  const { termination_date, termination_reason, portal_access_until } = data;

  // Update employee record
  await query(
    `UPDATE employees SET status = 'TERMINATED', termination_date = $1, termination_reason = $2, updated_at = now() WHERE user_id = $3 AND tenant_id = $4`,
    [termination_date, termination_reason, id, actor.tenantId]
  );

  // AUTO-CANCEL FUTURE LEAVES
  const empId = empCheck.rows[0].id;
  await query(
    `UPDATE leave_applications 
     SET status = 'CANCELLED', updated_at = now(), rejection_reason = 'Auto-cancelled due to termination'
     WHERE employee_id = $1 AND tenant_id = $2 
     AND status IN ('PENDING', 'PENDING_HR', 'APPROVED')
     AND start_date >= CURRENT_DATE`,
    [empId, actor.tenantId]
  );

  // Update user record (portal access)
  const userRes = await query(
    `UPDATE users 
     SET is_active = CASE WHEN $1 > CURRENT_DATE THEN true ELSE false END,
         is_deleted = true,
         portal_access_until = $1,
         updated_at = now() 
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [portal_access_until || null, id, actor.tenantId]
  );

  if (userRes.rowCount === 0) {
    throw new Error('User not found or access denied');
  }

  return { success: true, message: "Employee terminated and deleted successfully" };
};

/* -------------------------- REHIRE EMPLOYEE -------------------------- */
exports.rehireEmployee = async (db, id, actor) => {
  const query = getQuery(db);

  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) {
    throw new Error("Not allowed to rehire employees");
  }

  await query(
    `UPDATE employees 
     SET status = 'ACTIVE', 
         termination_date = null, 
         termination_reason = null, 
         updated_at = now() 
     WHERE user_id = $1 AND tenant_id = $2`,
    [id, actor.tenantId]
  );

  await query(
    `UPDATE users SET is_active = true, portal_access_until = null, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
    [id, actor.tenantId]
  );

  return { success: true, message: "Employee rehired successfully" };
};

/* -------------------------- LIST USERS -------------------------- */
exports.getUsers = async (db, opts, actor) => {
  const query = getQuery(db);

  const filter = [];
  const params = [];
  let i = 1;

  // Tenant filtering logic
  if (actor.role === 'SUPER_ADMIN' && !actor.tenantId) {
    // Super Admin can see all, or filter by specific tenant if provided
    if (opts.tenant_id) {
      filter.push(`u.tenant_id = $${i}`);
      params.push(opts.tenant_id);
      i++;
    }
  } else {
    // Regular users are scoped to their own tenant
    filter.push(`u.tenant_id = $${i}`);
    params.push(actor.tenantId);
    i++;
  }

  // Restricted Visibility for MANAGER and EMPLOYEE
  // Managers see: Direct reports, Project-mates, Self
  // Employees see: Teammates (same manager), Manager, Project-mates, Self
  if (actor.role === 'MANAGER') {
    if (!actor.employeeId) {
      // If user has no employee record, they can only see themselves
      filter.push(`u.id = $${i}`);
      params.push(actor.id);
      i++;
    } else {
      filter.push(`(
        e.id = $${i} -- Self
        OR e.reports_to = $${i} -- Direct reports (for managers)
        OR EXISTS (
          SELECT 1 FROM project_members pm1 
          JOIN project_members pm2 ON pm1.project_id = pm2.project_id 
          WHERE pm1.employee_id = $${i} AND pm2.employee_id = e.id
        ) -- Project mates
      )`);
      params.push(actor.employeeId);
      i++;
    }
  } else if (actor.role === 'EMPLOYEE') {
    if (!actor.employeeId) {
      filter.push(`u.id = $${i}`);
      params.push(actor.id);
      i++;
    } else {
      filter.push(`(
        e.id = $${i} -- Self
        OR EXISTS (
          SELECT 1 FROM employees emp_self 
          WHERE emp_self.id = $${i} 
          AND (
            e.id = emp_self.reports_to -- My Manager
            OR (e.reports_to = emp_self.reports_to AND e.reports_to IS NOT NULL) -- Teammates
          )
        )
        OR EXISTS (
          SELECT 1 FROM project_members pm1 
          JOIN project_members pm2 ON pm1.project_id = pm2.project_id 
          WHERE pm1.employee_id = $${i} AND pm2.employee_id = e.id
        ) -- Project mates
      )`);
      params.push(actor.employeeId);
      i++;
    }
  }

  if (opts.role) {
    filter.push(`u.role = $${i}`);
    params.push(opts.role);
    i++;
  }

  if (opts.search) {
    filter.push(`(u.email ILIKE $${i} OR e.first_name ILIKE $${i} OR e.last_name ILIKE $${i} OR e.employee_id ILIKE $${i})`);
    params.push(`%${opts.search}%`);
    i++;
  }

  if (opts.department_id) {
    filter.push(`e.department_id = $${i}`);
    params.push(opts.department_id);
    i++;
  }

  // Always include is_deleted check in filters if not already there
  filter.push("u.is_deleted = false");

  const where = filter.length ? "WHERE " + filter.join(" AND ") : "";

  const sql = `
    SELECT u.id, u.email, u.role, u.is_active, u.tenant_id, u.created_at,
           e.id AS employee_uuid, e.employee_id AS employee_code, e.first_name, e.last_name, e.department_id, e.designation_id,
           e.shift, e.shift_id, e.profile_photo_url, u.status, u.status_message, u.status_expiry
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = u.tenant_id
    ${where}
    ORDER BY u.created_at DESC
  `;

  const rows = await query(sql, params);
  return rows.rows;
};

/* ------------------------- GET ONE USER ------------------------- */
exports.getUserById = async (db, id, tenantId, requester, options = {}) => {
  const query = getQuery(db);
  const res = await query(
    `
     SELECT u.*, 
            u.status_message, u.status_expiry,
            e.id AS employee_uuid,
            e.first_name, e.last_name, e.phone, e.department_id, e.designation_id, e.reports_to,
             e.employee_id, e.join_date, e.employment_type, e.shift_id,
            e.date_of_birth, e.gender, e.marital_status, e.nationality, e.address,
            e.emergency_name, e.emergency_phone, e.emergency_relation,
            e.emergency_name, e.emergency_phone, e.emergency_relation,
            COALESCE(esd.bank_name, e.bank_name) as bank_name, e.account_name, COALESCE(esd.bank_account_number, e.account_number) as account_number, COALESCE(esd.bank_ifsc, e.ifsc_code) as ifsc_code, e.tax_id,
            e.uan, e.pf_account, e.esi_number, e.profile_photo_url, e.aadhar_number, e.branch_name, e.annual_salary, e.job_location,
            m.id AS manager_uuid, m.first_name AS manager_first_name, m.last_name AS manager_last_name,
            COALESCE(sh.name, e.shift) as shift,
            sh.week_offs as shift_week_offs,
            esd.ctc,
            t.plan_type
     FROM users u 
     LEFT JOIN employees e ON e.user_id = u.id
     JOIN tenants t ON u.tenant_id = t.id
     LEFT JOIN employees m ON m.id = e.reports_to
     LEFT JOIN shifts sh ON sh.id = e.shift_id
     LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = true
     WHERE (u.id::text=$1 OR e.employee_id=$1) AND u.tenant_id=$2
     LIMIT 1
     `,
    [id, tenantId]
  );

  const user = res.rows[0];
  if (user && user.manager_uuid) {
    user.manager = {
      id: user.manager_uuid,
      first_name: user.manager_first_name,
      last_name: user.manager_last_name
    };
  }

  if (user) {
    // Determine requester's relationship to this user
    const isSelf = requester ? requester.id === id : false;
    const isHRAdmin = requester ? ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(requester.role) : false;
    const isDirectManager = requester ? user.reports_to === requester.employeeId : false;
    
    // Check if the requester is a delegate who can see this employee
    let isDelegate = false;
    if (requester && requester.role === 'MANAGER' && !isDirectManager) {
        const delegateCheck = await query(
            `SELECT 1 FROM approval_delegations 
             WHERE tenant_id = $1 AND delegate_id = $2 AND delegator_id = $3
               AND is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`,
            [tenantId, requester.id, user.reports_to]
        );
        if (delegateCheck.rowCount > 0) isDelegate = true;
    }

    const isAuthorized = isSelf || isHRAdmin || isDirectManager || isDelegate;

    if (!isAuthorized) {
        throw new Error("Unauthorized: You do not have permission to view this employee's profile");
    }

    // If unmask=true AND the requester is authorized, decrypt WITHOUT masking (for Edit form)
    // Otherwise, decrypt and mask as usual (for Profile View)
    if (options.unmask && isAuthorized) {
      decryptFields(user);
    } else {
      decryptAndMaskFields(user);
    }

    // Apply strict filtering based on the requester's role
    if (requester) {
      if (!isSelf && !isHRAdmin && !(isManager && isDirectReport)) {
        // Hide sensitive fields completely from unauthorized eyes
        delete user.ctc;
        delete user.annual_salary;
        delete user.account_number;
        delete user.ifsc_code;
        delete user.bank_name;
        delete user.account_name;
        delete user.tax_id;
        delete user.aadhar_number;
        delete user.uan;
        delete user.pf_account;
        delete user.esi_number;
        delete user.emergency_phone;
        delete user.emergency_name;
        delete user.emergency_relation;
      }
    }
  }

  return user || null;
};

/* ---------------------- EMPLOYEE PROFILE UPDATE ---------------------- */
exports.updateEmployee = async (db, id, updates, actor) => {
  const isTransactionClient = db && typeof db.release === 'function';
  const client = isTransactionClient ? db : await pool.connect();

  try {
    if (!isTransactionClient) await client.query("BEGIN");

    const query = (sql, params) => client.query(sql, params);
    const tenantId = actor.tenantId;

    const allowed = [
      // Personal
      "first_name",
      "last_name",
      "phone",
      "date_of_birth",
      "gender",
      "marital_status",
      "nationality",

      // Emergency
      "emergency_name",
      "emergency_phone",
      "emergency_relation",

      // Professional
      "employee_id",
      "department_id",
      "designation_id",
      "reports_to",
      "join_date",
      "employment_type",
      "shift",
      "shift_id",

      // Finance
      "bank_name",
      "account_name",
      "account_number",
      "ifsc_code",
      "tax_id",
      "uan",
      "pf_account",
      "esi_number",

      "annual_salary",
      "ctc", // support both aliases

      // Address
      "address",
      "profile_photo_url",
      "aadhar_number",
      "timezone"
    ];

    const fields = [];
    const params = [];
    let i = 1;

    // Resolve the internal UUID if an Employee ID was provided
    const userRes = await query(
      `SELECT u.id as user_id, e.id as employee_uuid 
       FROM users u 
       LEFT JOIN employees e ON e.user_id = u.id 
       WHERE (u.id::text = $1 OR e.employee_id = $1) AND u.tenant_id = $2`,
      [id, tenantId]
    );

    if (userRes.rowCount === 0) {
      throw new Error("User not found or access denied");
    }

    const resolvedUserId = userRes.rows[0].user_id;
    const resolvedEmpUuid = userRes.rows[0].employee_uuid;

    // Check for duplicate sensitive fields (exclude current user from check)
    await checkEncryptedDuplicates(client, tenantId, updates, resolvedUserId);

    // CIRCULAR REPORTING CHECK
    if (updates.reports_to && resolvedEmpUuid) {
      await checkCircularReporting(client, resolvedEmpUuid, updates.reports_to, tenantId);
    }

    // Encrypt sensitive fields before building update query
    const sensitiveSet = new Set(SENSITIVE_FIELDS);

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        const fieldName = key === 'ctc' ? 'annual_salary' : key;
        let value = updates[key];
        
        // Fix: Convert empty strings to null for PostgreSQL strictness
        if (value === '') value = null;

        // Encrypt if this is a sensitive field and has a value
        if (sensitiveSet.has(key) && value !== null) {
          value = encrypt(value);
        }
        fields.push(`${fieldName}=$${i}`);
        params.push(value);
        i++;
      }
    }

    if (fields.length === 0) {
      // Check if we just want to fetch the record (no updates provided)
      const fetchRes = await query(`SELECT * FROM employees WHERE user_id=$1 AND tenant_id=$2`, [resolvedUserId, tenantId]);
      return fetchRes.rows[0];
    }

    params.push(resolvedUserId);
    params.push(tenantId);

    const sql = `
    UPDATE employees 
    SET ${fields.join(", ")}, updated_at=now()
    WHERE user_id=$${i} AND tenant_id=$${i + 1}
    RETURNING *
  `;

    const result = await query(sql, params);

    // Update salary details if CTC or bank info changed
    try {
      if (updates.ctc !== undefined || updates.bank_name || updates.account_number || updates.ifsc_code) {
        const empId = result.rows[0].id;
        const esdCheck = await query(
          `SELECT id FROM employee_salary_details WHERE employee_id = $1 AND is_current = true`,
          [empId]
        );

        if (esdCheck.rowCount > 0) {
          // Update existing
          const esdFields = [];
          const esdParams = [];
          let esdIdx = 1;

          if (updates.ctc !== undefined) { esdFields.push(`ctc=$${esdIdx++}`); esdParams.push(updates.ctc); }
          if (updates.bank_name !== undefined) { esdFields.push(`bank_name=$${esdIdx++}`); esdParams.push(updates.bank_name); }
          if (updates.account_number !== undefined) { esdFields.push(`bank_account_number=$${esdIdx++}`); esdParams.push(updates.account_number ? encrypt(updates.account_number) : null); }
          if (updates.ifsc_code !== undefined) { esdFields.push(`bank_ifsc=$${esdIdx++}`); esdParams.push(updates.ifsc_code ? encrypt(updates.ifsc_code) : null); }

          if (esdFields.length > 0) {
            esdParams.push(empId);
            await query(
              `UPDATE employee_salary_details SET ${esdFields.join(", ")}, updated_at=now() WHERE employee_id=$${esdIdx} AND is_current=true`,
              esdParams
            );
          }
        } else {
          // Create new
          await query(
            `INSERT INTO employee_salary_details (tenant_id, employee_id, ctc, bank_name, bank_account_number, bank_ifsc, is_current)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [tenantId, empId, updates.ctc || 0, updates.bank_name || null, updates.account_number ? encrypt(updates.account_number) : null, updates.ifsc_code ? encrypt(updates.ifsc_code) : null]
          );
        }

        // New Keka-style handling
        if (updates.ctc !== undefined) {
          try {
            const salaryStructureService = require("../payroll/salary/salaryStructure.service");
            const defaultStructure = await query(
              `SELECT id FROM salary_structures WHERE tenant_id = $1 AND is_default = TRUE AND is_active = TRUE`,
              [tenantId]
            );

            if (defaultStructure.rowCount > 0) {
              await salaryStructureService.assignEmployeeSalary(
                tenantId,
                empId,
                {
                  structure_id: defaultStructure.rows[0].id,
                  annual_ctc: parseFloat(updates.ctc),
                  effective_from: updates.join_date || new Date().toISOString().split('T')[0],
                  revision_reason: 'Salary update from profile'
                },
                actor.id
              );
            }
          } catch (assignError) {
            logger.error("Failed to update salary assignment in updateEmployee:", assignError.message);
          }
        }
      }
    } catch (salaryError) {
      logger.error("Error updating salary details:", salaryError.message);
    }

    // Role Change Logic
    if (updates.role) {
      // [ADMIN LIMIT CHECK FOR ROLE CHANGE]
      if (updates.role === 'ADMIN') {
        const adminCountRes = await client.query(
          'SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND is_deleted = false',
          [tenantId, 'ADMIN']
        );
        const currentAdmins = parseInt(adminCountRes.rows[0].count, 10);

        const tenantRes = await client.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
        const planType = tenantRes.rows[0]?.plan_type || 1;
        const limits = { 1: 1, 2: 5, 3: 999999 };

        if (currentAdmins >= limits[planType]) {
          throw new Error(`Your ${planType === 1 ? 'STANDARD' : 'PREMIUM'} plan is limited to ${limits[planType]} Admin user${limits[planType] > 1 ? 's' : ''}. Please upgrade to promote more users.`);
        }
      }

      // [CUSTOM ROLE CHECK FOR ROLE CHANGE]
      const systemRoles = ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"];
      if (!systemRoles.includes(updates.role)) {
        const tenantRes = await client.query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
        const planType = tenantRes.rows[0]?.plan_type || 1;
        if (planType === 1) {
          throw new Error("Custom roles are not available on the STANDARD plan.");
        }
      }

      await query(
        `UPDATE users SET role = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
        [updates.role, result.rows[0].user_id, tenantId]
      );
    }

    if (!isTransactionClient) await client.query("COMMIT");
    return result.rows[0];

  } catch (err) {
    if (!isTransactionClient) await client.query("ROLLBACK");
    // Handle database unique constraint violations
    if (err.code === '23505') {
      if (err.constraint === 'employees_employee_id_key' || err.message.includes('employee_id')) {
        throw new Error(`Employee ID "${updates.employee_id}" is already assigned to another employee`);
      }
      if (err.constraint === 'users_email_per_tenant' || err.message.includes('email')) {
        throw new Error("An employee with this email address already exists in your organization");
      }
    }

    // Check if it was just a salary detail error (which we logged and continued)
    // Actually we want to rethrow critical errors, but salary detail errors were already caught in inner try/catch blocks

    throw err;
  } finally {
    if (!isTransactionClient) client.release();
  }
};

/* ---------------------------- ESS: MY PROFILE ---------------------------- */
exports.getMyProfile = async (db, user) => {
  const query = getQuery(db);
  const res = await query(
    `
    SELECT
      u.id, u.email, u.role, u.is_active, u.two_factor_enabled, u.created_at, u.updated_at,
      COALESCE(e.first_name, '') as first_name,
      COALESCE(e.last_name, '') as last_name,
      e.phone,
      e.employee_id,
      e.department_id,
      e.designation_id,
      e.date_of_birth,
      e.gender,
      e.marital_status,
      e.nationality,
      e.address,
      e.emergency_name,
      e.emergency_phone,
      e.emergency_relation,
      e.join_date,
      e.employment_type,
      COALESCE(sh.name, e.shift) as shift,
      sh.start_time as shift_start_time,
      sh.end_time as shift_end_time,
      sh.week_offs as shift_week_offs,
      e.shift_id,
      COALESCE(esd.bank_name, e.bank_name) as bank_name,
      COALESCE(esd.bank_account_number, e.account_number) as account_number,
      COALESCE(esd.bank_ifsc, e.ifsc_code) as ifsc_code,
      e.account_name,
      e.tax_id,
      e.uan,
      e.pf_account,
      e.esi_number,
      e.aadhar_number,
      e.reports_to,
      e.timezone,
      m.first_name as manager_first_name,
      m.last_name as manager_last_name,
      e.profile_photo_url,
      s.status as subscription_status,
      p.name as subscription_plan_name,
      (
        COALESCE(t.settings, '{}'::jsonb) || 
        jsonb_build_object(
          'company_name', t.name,
          'phone', t.phone,
          'address', t.address,
          'city', t.city,
          'state', t.state,
          'country', t.country,
          'zip_code', t.zip_code,
          'domain', t.domain
        )
      ) as tenant_settings
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN employees m ON m.id = e.reports_to
    LEFT JOIN shifts sh ON sh.id = e.shift_id
    LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = true
    LEFT JOIN tenants t ON t.id = u.tenant_id
    LEFT JOIN LATERAL (
      SELECT s2.* FROM subscriptions s2
      WHERE s2.tenant_id = u.tenant_id
        AND s2.status NOT IN ('EXPIRED', 'CANCELLED')
      ORDER BY
        CASE s2.status
          WHEN 'ACTIVE' THEN 1
          WHEN 'TRIAL' THEN 2
          WHEN 'CANCEL_AT_PERIOD_END' THEN 3
          ELSE 4
        END,
        s2.created_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE u.id=$1
    `,
    [user.id]
  );

  if (res.rows.length === 0) {
    throw new Error('User not found');
  }

  // Decrypt and mask sensitive fields before returning
  decryptAndMaskFields(res.rows[0]);

  return res.rows[0];
};

exports.updateMyProfile = async (db, user, updates) => {
  const query = getQuery(db);

  // Check if employee record exists
  const existing = await query(
    `SELECT id FROM employees WHERE user_id = $1`,
    [user.id]
  );

  if (existing.rowCount === 0) {
    logger.info(`Creating missing employee record for user ${user.id}`);
    
    // Auto-generate employee ID using tenant's default
    const employeeId = await tenantService.generateNextEmployeeId(user.tenantId);

    // Create employee record if it doesn't exist
    await query(
      `
      INSERT INTO employees
        (tenant_id, user_id, first_name, last_name, phone, employee_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        user.tenantId,
        user.id,
        updates.first_name || '',
        updates.last_name || '',
        updates.phone || null,
        employeeId || `EMP-${user.id.substring(0, 8)}`,
        user.id
      ]
    );
  }

  // SECURITY: Only allow a user to update certain personal fields on their own.
  // Prohibit them from updating their own Role, Professional Details, or Salary via this endpoint.
  const personalUpdates = {};
  const personalAllowed = [
    "first_name", "last_name", "phone", "date_of_birth", "gender", 
    "marital_status", "nationality", "address", "profile_photo_url",
    "emergency_name", "emergency_phone", "emergency_relation", "timezone"
  ];

  for (const field of personalAllowed) {
    if (updates[field] !== undefined) {
      personalUpdates[field] = updates[field];
    }
  }

  // Now update the employee record
  return this.updateEmployee(db, user.id, personalUpdates, user);
};

/* ---------------------- UPDATE USER STATUS ---------------------- */
exports.updateUserStatus = async (db, id, isActive, actor) => {
  if (!isActive && id === actor.id) {
    throw new Error('You cannot deactivate your own account');
  }

  const query = getQuery(db);
  const res = await query(
    `UPDATE users SET is_active=$1, updated_at=now() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
    [isActive, id, actor.tenantId]
  );

  if (res.rowCount === 0) {
    throw new Error('User not found or access denied');
  }

  return res.rows[0];
};

exports.deactivateUser = async (db, id, actor) => {
  return this.updateUserStatus(db, id, false, actor);
};

exports.activateUser = async (db, id, actor) => {
  return this.updateUserStatus(db, id, true, actor);
};

/* ---------------------- UPDATE USER EMAIL ---------------------- */
exports.updateUser = async (db, id, updates, actor) => {
  const query = getQuery(db);
  const allowed = ["email", "is_active"];
  const fields = [];
  const params = [];
  let i = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key}=$${i}`);
      params.push(updates[key]);
      i++;
    }
  }

  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  params.push(id);
  params.push(actor.tenantId);

  const sql = `
    UPDATE users 
    SET ${fields.join(", ")}, updated_at=now()
    WHERE id=$${i} AND tenant_id=$${i + 1}
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
};

/* ---------------------- ROLE & ASSIGNMENT UPDATES ---------------------- */
exports.changeRole = async (db, id, newRole, actor) => {
  const query = getQuery(db);
  const tenantId = actor.tenantId;

  // [ADMIN LIMIT CHECK]
  if (newRole === 'ADMIN') {
    const adminCountRes = await query(
      'SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND is_deleted = false',
      [tenantId, 'ADMIN']
    );
    const currentAdmins = parseInt(adminCountRes.rows[0].count, 10);

    const tenantRes = await query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    const limits = { 1: 1, 2: 5, 3: 999999 };

    if (currentAdmins >= limits[planType]) {
      throw new Error(`Your ${planType === 1 ? 'STANDARD' : 'PREMIUM'} plan is limited to ${limits[planType]} Admin user${limits[planType] > 1 ? 's' : ''}. Please upgrade to promote more users.`);
    }
  }

  // [CUSTOM ROLE CHECK]
  const systemRoles = ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"];
  if (!systemRoles.includes(newRole)) {
    const tenantRes = await query('SELECT plan_type FROM tenants WHERE id = $1', [tenantId]);
    const planType = tenantRes.rows[0]?.plan_type || 1;
    if (planType === 1) {
      throw new Error("Custom roles are not available on the STANDARD plan.");
    }
  }

  const res = await query(
    `UPDATE users SET role=$1, updated_at=now() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
    [newRole, id, tenantId]
  );
  return res.rows[0];
};

exports.changeManager = async (db, id, managerEmployeeId, actor) => {
  const query = getQuery(db);

  // Validate that manager exists and has MANAGER role
  const managerCheck = await query(
    `SELECT u.id, u.role FROM users u
     JOIN employees e ON e.user_id = u.id
     WHERE e.id = $1 AND u.tenant_id = $2`,
    [managerEmployeeId, actor.tenantId]
  );

  if (managerCheck.rowCount === 0) {
    throw new Error("Manager not found in your organization");
  }

  const manager = managerCheck.rows[0];
  if (manager.role !== "MANAGER") {
    throw new Error("Only MANAGER role users can be assigned as reporting manager");
  }

  // Get the employee's ID (not user ID)
  const employeeCheck = await query(
    `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2`,
    [id, actor.tenantId]
  );

  if (employeeCheck.rowCount === 0) {
    throw new Error("Employee not found");
  }

  const employeeId = employeeCheck.rows[0].id;

  // SECURITY FIX: Detect circular reporting lines
  // Traverse up the manager's reporting chain to ensure the employee is not in it
  const visited = new Set();
  let currentManagerId = managerEmployeeId;
  const MAX_DEPTH = 50; // Prevent infinite loops in case of existing circular data
  let depth = 0;

  while (currentManagerId && depth < MAX_DEPTH) {
    if (currentManagerId === employeeId) {
      throw new Error("Circular reporting line detected. This assignment would create a loop in the reporting hierarchy.");
    }

    if (visited.has(currentManagerId)) {
      // Existing circular reference in the chain - break to avoid infinite loop
      logger.warn(`Existing circular reference detected in reporting chain at employee ${currentManagerId}`);
      break;
    }

    visited.add(currentManagerId);

    const parentResult = await query(
      `SELECT reports_to FROM employees WHERE id = $1 AND tenant_id = $2`,
      [currentManagerId, actor.tenantId]
    );

    if (parentResult.rowCount === 0 || !parentResult.rows[0].reports_to) {
      break; // Reached top of hierarchy
    }

    currentManagerId = parentResult.rows[0].reports_to;
    depth++;
  }

  const res = await query(
    `UPDATE employees SET reports_to=$1, updated_at=now() WHERE user_id=$2 AND tenant_id=$3 RETURNING *`,
    [managerEmployeeId, id, actor.tenantId]
  );
  return res.rows[0];
};

exports.assignDepartment = async (db, id, departmentId, actor) => {
  const query = getQuery(db);

  // Verify department belongs to the same tenant
  const deptCheck = await query(
    `SELECT id FROM departments WHERE id = $1 AND tenant_id = $2`,
    [departmentId, actor.tenantId]
  );

  if (deptCheck.rowCount === 0) {
    throw new Error("Department not found or does not belong to your organization");
  }

  const res = await query(
    `UPDATE employees SET department_id=$1, updated_at=now() WHERE user_id=$2 AND tenant_id=$3 RETURNING *`,
    [departmentId, id, actor.tenantId]
  );
  return res.rows[0];
};

exports.assignDesignation = async (db, id, designationId, actor) => {
  const res = await query(
    `UPDATE employees SET designation_id=$1, updated_at=now() WHERE user_id=$2 AND tenant_id=$3 RETURNING *`,
    [designationId, id, actor.tenantId]
  );
  return res.rows[0];
};

/* ---------------------- ORG TREE ---------------------- */
/* ---------------------- UPDATE PROFILE PHOTO ---------------------- */
exports.updateProfilePhoto = async (db, userId, photoPath, actor) => {
  const fs = require('fs');
  const { Client } = require('pg');
  // Use path.resolve or just relative path, checking dir structure:
  // Current file: backend/src/modules/users/user.service.js
  // config: backend/src/config/env -> ../../config/env
  const env = require('../../config/env');

  console.log("[updateProfilePhoto] Service called for User:", userId, "Tenant:", actor.tenantId, "Path:", photoPath);

  // Use a raw client to bypass RLS restrictions that block self-update visibility
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: (env.NODE_ENV === "production" || (env.DATABASE_URL && !env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1')))
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    await client.connect();

    // 2. Update with new path
    const updatedUrl = photoPath ? photoPath.replace(/\\/g, '/') : null;

    // 1. Get current photo to delete it (Bypassing RLS)
    const currentRes = await client.query(`SELECT profile_photo_url FROM employees WHERE user_id = $1`, [userId]);

    // Only delete if the new URL is different from the old one
    if (currentRes.rowCount > 0 && currentRes.rows[0].profile_photo_url && currentRes.rows[0].profile_photo_url !== updatedUrl) {
      try {
        if (fs.existsSync(currentRes.rows[0].profile_photo_url)) {
          fs.unlinkSync(currentRes.rows[0].profile_photo_url);
          console.log("[updateProfilePhoto] Deleted old photo:", currentRes.rows[0].profile_photo_url);
        }
      } catch (e) {
        console.error("Failed to delete old profile photo:", e);
      }
    }
    console.log("[updateProfilePhoto] Executing UPDATE employees SET profile_photo_url =", updatedUrl);

    const updateRes = await client.query(
      `UPDATE employees SET profile_photo_url=$1, updated_at=now() WHERE user_id=$2 RETURNING *`,
      [updatedUrl, userId]
    );

    if (updateRes.rowCount === 0) {
      console.warn("[updateProfilePhoto] UPDATE affected 0 rows via raw client. Attempting to create employee record.");

      // Fetch user details for insert
      const userDetails = await client.query(`SELECT first_name, last_name, email, role FROM users WHERE id = $1`, [userId]);

      if (userDetails.rowCount === 0) {
        throw new Error("User not found in users table. Cannot create employee record.");
      }

      const { first_name, last_name, email, role } = userDetails.rows[0];

      // Insert with raw client
      const insertRes = await client.query(`
            INSERT INTO employees (
                user_id, tenant_id, profile_photo_url, first_name, last_name, email, role, status, 
                created_at, updated_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', now(), now(), $1)
            RETURNING *
          `, [userId, actor.tenantId, updatedUrl, first_name || '', last_name || '', email, role]);

      console.log("[updateProfilePhoto] Created new employee record:", insertRes.rows[0].id);
      return insertRes.rows[0];
    }

    console.log("[updateProfilePhoto] UPDATE success via raw client. Row returned:", updateRes.rows[0].id);
    return updateRes.rows[0];

  } catch (err) {
    console.error("[updateProfilePhoto] Error with raw client:", err);
    throw err;
  } finally {
    await client.end();
  }
};

exports.removeProfilePhoto = async (db, userId, actor) => {
  const query = getQuery(db);
  const fs = require('fs');
  // Get current photo to delete it
  const current = await query(`SELECT profile_photo_url FROM employees WHERE user_id = $1`, [userId]);
  if (current.rowCount > 0 && current.rows[0].profile_photo_url) {
    try {
      if (fs.existsSync(current.rows[0].profile_photo_url)) {
        fs.unlinkSync(current.rows[0].profile_photo_url);
      }
    } catch (e) {
      console.error("Failed to delete old profile photo:", e);
    }
  }

  const res = await query(
    `UPDATE employees SET profile_photo_url=NULL, updated_at=now() WHERE user_id=$1 AND tenant_id=$2 RETURNING *`,
    [userId, actor.tenantId]
  );
  return res.rows[0];
};

exports.getOrgTree = async (db, actor) => {
  const query = getQuery(db);


  const sql = `
    SELECT 
      e.id, 
      e.user_id,
      e.first_name, 
      e.last_name, 
      e.reports_to,
      e.employee_id,
      d.name as designation_name,
      dep.name as department_name,
      u.role,
      u.email
    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN designations d ON d.id = e.designation_id
    LEFT JOIN departments dep ON dep.id = e.department_id
    WHERE e.tenant_id = $1 AND u.is_active = true AND u.is_deleted = false
  `;

  const params = [actor.tenantId];

  // Fetch all active employees with their details
  const res = await query(sql, params);

  const employees = res.rows;

  if (employees.length === 0) return null;

  // Build a map for easy lookup
  const empMap = {};
  employees.forEach(emp => {
    empMap[emp.id] = {
      ...emp,
      children: [],
      name: `${emp.first_name} ${emp.last_name}`,
      title: `${emp.designation_name || 'No Designation'} · ${emp.department_name || 'No Department'}`,
      // Add employee ID to display if desired, or just for debugging
      employeeId: emp.employee_id,
      initials: (emp.first_name[0] || '') + (emp.last_name ? emp.last_name[0] : '')
    };
  });

  const roots = [];

  // Build the tree
  employees.forEach(emp => {
    // If reports_to is null or points to a non-existent employee (e.g. deleted manager), treat as root
    if (emp.reports_to && empMap[emp.reports_to]) {
      empMap[emp.reports_to].children.push(empMap[emp.id]);
    } else {
      roots.push(empMap[emp.id]);
    }
  });

  // If there are multiple roots, we might want to group them under a virtual "Organization" node or just return the list.
  // For the frontend visualization which expects a single root (usually), if there are multiple roots, 
  // we can pick the one with the 'ADMIN' or 'SUPER_ADMIN' role if possible, or just return the first one 
  // and attach others? 
  // Let's return the most logical root: usually the CEO/Founder/Admin.

  // Refinement: Sort roots so that Admin/Manager roles come first
  roots.sort((a, b) => {
    const rolePriority = { 'SUPER_ADMIN': 0, 'ADMIN': 1, 'HR': 2, 'MANAGER': 3, 'EMPLOYEE': 4 };
    return (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99);
  });

  // If we really need a single root for the chart library, and we have multiple (e.g. multiple partners),
  // we might need to wrap them. For now, let's return the top-most root.
  // The frontend expects a single object for the tree root.

  if (roots.length === 1) return roots[0];

  // If multiple roots, return a virtual root
  return {
    id: 'root',
    name: 'Organization',
    title: 'Hierarchy',
    initials: 'ORG',
    children: roots
  };
};

/* ------------------------- BULK IMPORT EMPLOYEES ------------------------- */
exports.bulkImportEmployees = async (db, fileBuffer, columnMapping, actor) => {
  const deptService = require('../departments/department.service');
  const desigService = require('../designation/designation.service');

  // 1. Parse Excel
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  if (!rawData || rawData.length === 0) {
    throw new Error("The uploaded file is empty");
  }

  const results = {
    total: rawData.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Fetch departments and designations for name-to-ID lookup
  const departments = await deptService.getDepartments(db, actor);
  const designations = await desigService.getDesignations(db, actor.tenantId, { limit: 1000 });

  const deptMap = {};
  departments.forEach(d => { deptMap[d.name.toLowerCase()] = d.id; });

  const desigMap = {};
  designations.forEach(d => { desigMap[d.name.toLowerCase()] = d.id; });

  const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // Use a shared database client to prevent slamming the database connection pool (Issue 4)
  const sharedClient = await pool.connect();

  try {
    // 2. Iterate and Create
    for (let idx = 0; idx < rawData.length; idx++) {
      const row = rawData[idx];
      const employeeData = {};

      // Map columns to fields
      Object.entries(columnMapping).forEach(([xlsxCol, hrmsField]) => {
        let value = row[xlsxCol];
        if (typeof value === 'string') value = value.trim();

        if (value !== undefined && hrmsField) {
          employeeData[hrmsField] = value;
        }
      });

      // Mandatory default values if missing
      if (!employeeData.role) employeeData.role = 'EMPLOYEE';
      if (!employeeData.employment_type) employeeData.employment_type = 'FULL_TIME';

      try {
        // Name-to-ID lookup for Department (Issue 5: Catch lookup errors)
        if (employeeData.department_id && !isUuid(employeeData.department_id)) {
          const originalValue = employeeData.department_id;
          const name = originalValue.trim().toLowerCase();
          if (deptMap[name]) {
            employeeData.department_id = deptMap[name];
          } else {
            throw new Error(`Department "${originalValue}" not found. Please create it first.`);
          }
        }

        // Name-to-ID lookup for Designation (Issue 5: Catch lookup errors)
        if (employeeData.designation_id && !isUuid(employeeData.designation_id)) {
          const originalValue = employeeData.designation_id;
          const name = originalValue.trim().toLowerCase();
          if (desigMap[name]) {
            employeeData.designation_id = desigMap[name];
          } else {
            throw new Error(`Designation "${originalValue}" not found. Please create it first.`);
          }
        }

        // Reuse the robust createUser logic using sharedClient
        await exports.createUser(sharedClient, employeeData, actor, true);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: idx + 2, // Excel rows start at 1, header is 1
          email: employeeData.email || 'N/A',
          name: employeeData.first_name || 'Unknown',
          error: err.message
        });
      }
    }
  } finally {
    sharedClient.release();
  }

  return results;
};

/* ------------------- REVEAL SENSITIVE FIELD (Audit-Logged) ------------------- */
exports.revealSensitiveField = async (db, targetUserId, fieldName, actor) => {
  const query = getQuery(db);

  // Validate field name
  if (!FIELD_CONFIG[fieldName]) {
    throw new Error(`Invalid field: ${fieldName}. Allowed fields: ${Object.keys(FIELD_CONFIG).join(', ')}`);
  }

  // Check if actor is viewing their own data
  const isSelf = actor.id === targetUserId;

  // Check if target is a direct report (for manager tier-3 access)
  let isDirectReport = false;
  if (actor.role === 'MANAGER' && actor.employeeId) {
    const reportCheck = await query(
      `SELECT 1 FROM employees WHERE user_id = $1 AND reports_to = $2 AND tenant_id = $3`,
      [targetUserId, actor.employeeId, actor.tenantId]
    );
    isDirectReport = reportCheck.rowCount > 0;
  }

  // Enforce tier-based access
  if (!canRevealField(actor.role, fieldName, isSelf, isDirectReport)) {
    throw new Error('You do not have permission to view this sensitive information');
  }

  // Determine which table and column to query
  let sql, params;
  if (['account_number', 'ifsc_code'].includes(fieldName)) {
    // These might come from employee_salary_details (preferred) or employees table
    const colMap = { account_number: 'bank_account_number', ifsc_code: 'bank_ifsc' };
    sql = `
      SELECT COALESCE(esd.${colMap[fieldName]}, e.${fieldName}) as value
      FROM employees e
      LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = true
      WHERE e.user_id = $1 AND e.tenant_id = $2
    `;
    params = [targetUserId, actor.tenantId];
  } else {
    sql = `SELECT ${fieldName} as value FROM employees WHERE user_id = $1 AND tenant_id = $2`;
    params = [targetUserId, actor.tenantId];
  }

  const res = await query(sql, params);
  if (res.rowCount === 0) {
    throw new Error('Employee not found');
  }

  const encryptedValue = res.rows[0].value;
  const decryptedValue = decrypt(encryptedValue);

  return { field: fieldName, value: decryptedValue };
};
