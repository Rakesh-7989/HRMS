const pool = require("../../config/db");
const { query: dbQuery, queryRLS } = require("../../middleware/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mailer = require("../../config/mailer");
const logger = require("../../config/logger");
const subscriptionService = require("../subscriptions/subscriptions.service");
const tenantService = require("../tenant/tenant.service");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : dbQuery;

/* ----------------------------- CREATE USER ----------------------------- */
exports.createUser = async (db, data, actor) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // SUPER_ADMIN can create anyone, ADMIN/HR have role restrictions
    if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) {
      throw new Error("Not allowed to create users");
    }

    // HR users can create EMPLOYEE and MANAGER only
    if (actor.role === "HR") {
      if (!["EMPLOYEE", "MANAGER"].includes(data.role)) {
        throw new Error("HR can only create EMPLOYEE or MANAGER roles");
      }
    }

    // ADMIN can create EMPLOYEE, MANAGER, HR
    if (actor.role === "ADMIN") {
      if (!["EMPLOYEE", "MANAGER", "HR"].includes(data.role)) {
        throw new Error("ADMIN can only create EMPLOYEE, MANAGER, or HR roles");
      }
    }

    // Only SUPER_ADMIN can create ADMIN role
    if (data.role === "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new Error("Only SUPER_ADMIN can create ADMIN role");
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
      throw new Error("Email Not Available");
    }
    // Auto-generate employee ID using tenant's configured prefix
    let generatedEmployeeId;
    try {
      generatedEmployeeId = await tenantService.generateNextEmployeeId(actor.tenantId, client);
    } catch (err) {
      throw new Error(err.message || "Failed to generate employee ID. Please configure the employee ID prefix first.");
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

    const empRes = await client.query(
      `
      INSERT INTO employees
        (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, marital_status, nationality, 
         emergency_name, emergency_phone, emergency_relation,
         employee_id, department_id, designation_id, reports_to, join_date, employment_type, shift, shift_id,
         bank_name, account_name, account_number, ifsc_code, tax_id, address,
         uan, pf_account, esi_number, created_by, aadhar_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$30,
         $20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
      RETURNING id
      `,
      [
        actor.tenantId,
        userRes.rows[0].id,
        data.first_name,
        data.last_name || null,
        data.phone || null,
        data.date_of_birth || null,
        data.gender || null,
        data.marital_status || null,
        data.nationality || null,
        data.emergency_name || null,
        data.emergency_phone || null,
        data.emergency_relation || null,
        generatedEmployeeId, // Use auto-generated ID
        data.department_id || null,
        data.designation_id || null,
        data.reports_to || null,
        data.join_date || null,
        data.employment_type || null,
        data.shift || null, // Keep legacy string if provided, or maybe we should fetch name? For now, keep as is.
        data.bank_name || null,
        data.account_name || null,
        data.account_number || null,
        data.ifsc_code || null,
        data.tax_id || null,
        data.address || null,
        data.uan || null,
        data.pf_account || null,
        data.esi_number || null,
        actor.id,
        data.shift_id || null, // New parameter at index 30
        data.aadhar_number || null // New parameter at index 31
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
            data.account_number || null,
            data.ifsc_code || null,
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
            actor.id
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
    client.release();
  }
};


/* -------------------------- SOFT DELETE USER -------------------------- */
exports.softDeleteUser = async (db, id, actor) => {
  const query = getQuery(db);

  // Only ADMIN/SUPER_ADMIN can delete
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("Only admins can delete users");
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

  const { termination_date, termination_reason, portal_access_until } = data;

  // Update employee record
  await query(
    `UPDATE employees 
     SET status = 'TERMINATED', 
         is_deleted = true,
         termination_date = $1, 
         termination_reason = $2, 
         updated_at = now() 
     WHERE user_id = $3 AND tenant_id = $4`,
    [termination_date || 'now()', termination_reason || null, id, actor.tenantId]
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

  // Manager filtering: Only show their direct reports (or hierarchical, but direct for now)
  if (actor.role === 'MANAGER') {
    if (!actor.employeeId) {
      console.warn(`[getUsers] MANAGER ${actor.id} has no employeeId linked. Returning empty list.`);
      return []; // Return empty if manager has no employee record to link reports_to
    }
    filter.push(`e.reports_to = $${i}`);
    params.push(actor.employeeId);
    i++;
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
           e.shift, e.shift_id, e.profile_photo_url
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = u.tenant_id
    ${where}
    ORDER BY u.created_at DESC
  `;

  const rows = await query(sql, params);
  return rows.rows;
};

/* ------------------------- GET ONE USER ------------------------- */
exports.getUserById = async (db, id, tenantId) => {
  const query = getQuery(db);
  const res = await query(
    `
     SELECT u.*, 
            e.id AS employee_uuid,
            e.first_name, e.last_name, e.phone, e.department_id, e.designation_id, e.reports_to,
             e.employee_id, e.join_date, e.employment_type, e.shift, e.shift_id,
            e.date_of_birth, e.gender, e.marital_status, e.nationality, e.address,
            e.emergency_name, e.emergency_phone, e.emergency_relation,
            e.bank_name, e.account_name, e.account_number, e.ifsc_code, e.tax_id,
            e.uan, e.pf_account, e.esi_number, e.profile_photo_url, e.aadhar_number,
            m.id AS manager_uuid, m.first_name AS manager_first_name, m.last_name AS manager_last_name,
            esd.ctc
     FROM users u 
     LEFT JOIN employees e ON e.user_id = u.id
     LEFT JOIN employees m ON m.id = e.reports_to
     LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = true
     WHERE u.id=$1 AND u.tenant_id=$2
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

  return user || null;
};

/* ---------------------- EMPLOYEE PROFILE UPDATE ---------------------- */
exports.updateEmployee = async (db, id, updates, actor) => {
  const query = getQuery(db);
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
    "aadhar_number"
  ];

  const fields = [];
  const params = [];
  let i = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      const fieldName = key === 'ctc' ? 'annual_salary' : key;
      fields.push(`${fieldName}=$${i}`);
      params.push(updates[key]);
      i++;
    }
  }

  params.push(id);
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
        if (updates.account_number !== undefined) { esdFields.push(`bank_account_number=$${esdIdx++}`); esdParams.push(updates.account_number); }
        if (updates.ifsc_code !== undefined) { esdFields.push(`bank_ifsc=$${esdIdx++}`); esdParams.push(updates.ifsc_code); }

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
          [tenantId, empId, updates.ctc || 0, updates.bank_name || null, updates.account_number || null, updates.ifsc_code || null]
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
  } catch (salaryDetailsError) {
    logger.warn("Salary details update failed in updateEmployee. Tables might be missing.", salaryDetailsError.message);
  }

  return result.rows[0];
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
      e.shift,
      e.shift_id,
      e.bank_name,
      e.account_name,
       e.account_number,
      e.ifsc_code,
      e.tax_id,
      e.uan,
      e.pf_account,
      e.esi_number,
      e.aadhar_number,
      e.reports_to,
      e.profile_photo_url,
      s.status as subscription_status,
      p.name as subscription_plan_name,
      t.settings as tenant_settings
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN tenants t ON t.id = u.tenant_id
    LEFT JOIN subscriptions s ON s.tenant_id = u.tenant_id AND s.status != 'CANCELLED'
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE u.id=$1
    ORDER BY s.created_at DESC
    LIMIT 1
    `,
    [user.id]
  );

  if (res.rows.length === 0) {
    throw new Error('User not found');
  }

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
    // Create employee record if it doesn't exist
    const empRes = await query(
      `
      INSERT INTO employees
        (tenant_id, user_id, first_name, last_name, phone, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        user.tenantId,
        user.id,
        updates.first_name || '',
        updates.last_name || '',
        updates.phone || null,
        user.id
      ]
    );
  }

  // Now update the employee record
  return this.updateEmployee(db, user.id, updates, user);
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
  const res = await query(
    `UPDATE users SET role=$1, updated_at=now() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
    [newRole, id, actor.tenantId]
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
