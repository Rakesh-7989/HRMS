const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date();
    const passwordHash = await bcrypt.hash('Test@1234', 4);
    const tenantId = 't_' + uuidv4().slice(0, 14);
    const superAdminId = 'u_' + uuidv4().slice(0, 14);
    const hrUserId = 'u_' + uuidv4().slice(0, 14);
    const empUserId = 'u_' + uuidv4().slice(0, 14);

    // 1. Tenant
    await client.query(
      `INSERT INTO tenants (id, name, domain, is_active, plan_type, plan_expiry_date, settings)
       VALUES ($1, 'Test Corp', 'test.vercel.app', true, 2, $2, '{}')`,
      [tenantId, new Date(now.getTime() + 365 * 86400000)]
    );

    // 2. Departments
    const deptIds = {};
    const depts = ['Engineering', 'Marketing', 'Finance', 'HR', 'Operations'];
    for (const name of depts) {
      const id = 'd_' + uuidv4().slice(0, 14);
      deptIds[name] = id;
      await client.query(
        `INSERT INTO departments (id, tenant_id, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [id, tenantId, name, now]
      );
    }

    // 3. Designations
    const desigIds = {};
    const desigs = ['Software Engineer', 'Senior Engineer', 'Team Lead', 'Manager', 'Director'];
    for (const name of desigs) {
      const id = 'des_' + uuidv4().slice(0, 12);
      desigIds[name] = id;
      await client.query(
        `INSERT INTO designations (id, tenant_id, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [id, tenantId, name, now]
      );
    }

    // 4. Super Admin (no tenant)
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, NULL, 'superadmin@test.com', $2, 'SUPER_ADMIN', true, $3, $3)`,
      [superAdminId, passwordHash, now]
    );

    // 5. HR Admin user
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'hr@testcorp.com', $3, 'ADMIN', true, $4, $4)`,
      [hrUserId, tenantId, passwordHash, now]
    );

    await client.query(
      `INSERT INTO employees (id, user_id, tenant_id, first_name, last_name, employee_code, department_id, designation_id, employment_type, created_at, updated_at)
       VALUES ($1, $2, $3, 'HR', 'Admin', 'EMP-001', $4, $5, 'PERMANENT', $6, $6)`,
      ['e_' + uuidv4().slice(0, 14), hrUserId, tenantId, deptIds['HR'], desigIds['Manager'], now]
    );

    // 6. Regular employee user
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'employee@testcorp.com', $3, 'EMPLOYEE', true, $4, $4)`,
      [empUserId, tenantId, passwordHash, now]
    );

    await client.query(
      `INSERT INTO employees (id, user_id, tenant_id, first_name, last_name, employee_code, department_id, designation_id, employment_type, join_date, created_at, updated_at)
       VALUES ($1, $2, $3, 'John', 'Doe', 'EMP-002', $4, $5, 'PERMANENT', $6, $7, $7)`,
      ['e_' + uuidv4().slice(0, 14), empUserId, tenantId, deptIds['Engineering'], desigIds['Software Engineer'], now, now]
    );

    // 7. More employees (8 more)
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const empCodes = ['EMP-003', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007', 'EMP-008', 'EMP-009', 'EMP-010'];
    const deptKeys = ['Engineering', 'Engineering', 'Marketing', 'Marketing', 'Finance', 'Finance', 'Operations', 'Operations'];
    const desigKeys = ['Software Engineer', 'Senior Engineer', 'Team Lead', 'Manager', 'Senior Engineer', 'Manager', 'Team Lead', 'Software Engineer'];
    const types = ['PERMANENT', 'PERMANENT', 'PERMANENT', 'CONTRACT', 'PERMANENT', 'PROBATION', 'PERMANENT', 'CONTRACT'];

    for (let i = 0; i < 8; i++) {
      const uId = 'u_' + uuidv4().slice(0, 14);
      const eId = 'e_' + uuidv4().slice(0, 14);
      await client.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'EMPLOYEE', true, $5, $5)`,
        [uId, tenantId, `${firstNames[i].toLowerCase()}@testcorp.com`, passwordHash, now]
      );
      await client.query(
        `INSERT INTO employees (id, user_id, tenant_id, first_name, last_name, employee_code, department_id, designation_id, employment_type, join_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
        [eId, uId, tenantId, firstNames[i], lastNames[i], empCodes[i], deptIds[deptKeys[i]], desigIds[desigKeys[i]], types[i], now, now]
      );
    }

    // 8. Attendance (last 90 days for each employee)
    const empResult = await client.query(`SELECT id FROM employees WHERE tenant_id = $1`, [tenantId]);
    const employeeIds = empResult.rows.map(r => r.id);

    for (const eid of employeeIds) {
      for (let d = 0; d < 90; d++) {
        const date = new Date(now.getTime() - d * 86400000);
        const day = date.getDay();
        if (day === 0) continue;
        const isPresent = Math.random() > 0.1;
        if (!isPresent) continue;
        const clockIn = new Date(date);
        clockIn.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
        const clockOut = new Date(clockIn);
        clockOut.setHours(clockIn.getHours() + 8 + Math.floor(Math.random() * 3));
        await client.query(
          `INSERT INTO attendance (id, tenant_id, employee_id, date, clock_in, clock_out, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'PRESENT', $7, $7)`,
          ['a_' + uuidv4().slice(0, 14), tenantId, eid, date, clockIn, clockOut, now]
        );
      }
    }

    // 9. Leave balances
    for (const eid of employeeIds) {
      await client.query(
        `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type, total_days, used_days, remaining_days, year, created_at, updated_at)
         VALUES ($1, $2, $3, 'CASUAL', 12, $4, $5, $6, $7, $7)`,
        ['lb_' + uuidv4().slice(0, 14), tenantId, eid, Math.floor(Math.random() * 5), Math.floor(8 + Math.random() * 4), now.getFullYear(), now]
      );
    }

    await client.query('COMMIT');

    console.log('Seeded: 1 tenant, 10 employees, 5 departments, 5 designations, ~800 attendance records, 10 leave balances');
    console.log('  Super Admin: superadmin@test.com / Test@1234');
    console.log('  HR Admin:    hr@testcorp.com / Test@1234');
    console.log('  Employee:    employee@testcorp.com / Test@1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
