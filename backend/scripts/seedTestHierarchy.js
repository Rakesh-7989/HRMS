const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const connectionString = "postgresql://hrms_user:admin@localhost:5432/hrms_saas_db";
const pool = new Pool({ connectionString });

async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Get or Create Tenant
        let tenantRes = await client.query("SELECT id FROM tenants WHERE name = 'Test Organization' LIMIT 1");
        let tenantId;
        if (tenantRes.rowCount === 0) {
            const res = await client.query(
                "INSERT INTO tenants (name, email, domain) VALUES ($1, $2, $3) RETURNING id",
                ["Test Organization", "test@org.com", "test.org"]
            );
            tenantId = res.rows[0].id;
        } else {
            tenantId = tenantRes.rows[0].id;
        }

        console.log(`Using Tenant ID: ${tenantId}`);

        // 2. Clear existing test users to avoid conflicts (optional but safer for clean test)
        // We'll skip clearing if we want to keep them, but use unique emails.
        const suffix = Date.now().toString().slice(-4);
        const passwordHash = await bcrypt.hash("Password123!", 10);

        const usersData = [
            { email: `ceo${suffix}@test.com`, role: 'ADMIN', firstName: 'Chief', lastName: 'Executive', empId: `EMP-CEO-${suffix}`, reportsToEmail: null },
            { email: `manager1${suffix}@test.com`, role: 'MANAGER', firstName: 'Manager', lastName: 'One', empId: `EMP-M1-${suffix}`, reportsToEmail: `ceo${suffix}@test.com` },
            { email: `manager2${suffix}@test.com`, role: 'MANAGER', firstName: 'Manager', lastName: 'Two', empId: `EMP-M2-${suffix}`, reportsToEmail: `ceo${suffix}@test.com` },
            { email: `hr1${suffix}@test.com`, role: 'HR', firstName: 'HR', lastName: 'Manager', empId: `EMP-HR1-${suffix}`, reportsToEmail: `ceo${suffix}@test.com` },
            { email: `emp1${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'One', empId: `EMP-E1-${suffix}`, reportsToEmail: `manager1${suffix}@test.com` },
            { email: `emp2${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'Two', empId: `EMP-E2-${suffix}`, reportsToEmail: `manager1${suffix}@test.com` },
            { email: `emp3${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'Three', empId: `EMP-E3-${suffix}`, reportsToEmail: `manager2${suffix}@test.com` },
            { email: `emp4${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'Four', empId: `EMP-E4-${suffix}`, reportsToEmail: `hr1${suffix}@test.com` },
            { email: `emp5${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'Five', empId: `EMP-E5-${suffix}`, reportsToEmail: `manager2${suffix}@test.com` },
            { email: `emp6${suffix}@test.com`, role: 'EMPLOYEE', firstName: 'Employee', lastName: 'Six', empId: `EMP-E6-${suffix}`, reportsToEmail: `ceo${suffix}@test.com` },
        ];

        const emailToEmployeeIdMap = {};

        // Create Users and Employees (without reports_to first)
        for (const data of usersData) {
            const userRes = await client.query(
                "INSERT INTO users (tenant_id, email, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [tenantId, data.email, passwordHash, data.role, false]
            );
            const userId = userRes.rows[0].id;

            const empRes = await client.query(
                "INSERT INTO employees (tenant_id, user_id, first_name, last_name, employee_id, status, join_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                [tenantId, userId, data.firstName, data.lastName, data.empId, 'ACTIVE', new Date()]
            );

            emailToEmployeeIdMap[data.email] = empRes.rows[0].id;
        }

        // Update reports_to
        for (const data of usersData) {
            if (data.reportsToEmail) {
                const managerId = emailToEmployeeIdMap[data.reportsToEmail];
                const empId = emailToEmployeeIdMap[data.email];
                await client.query(
                    "UPDATE employees SET reports_to = $1 WHERE id = $2",
                    [managerId, empId]
                );
            }
        }

        // Add some leave policies if they don't exist for this tenant
        const ltRes = await client.query(
            "INSERT INTO leave_types (tenant_id, name, code, is_paid, requires_approval) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [tenantId, 'Annual Leave', 'AL', true, true]
        );
        const leaveTypeId = ltRes.rows[0].id;

        await client.query(
            "INSERT INTO leave_policies (tenant_id, leave_type_id, name, accrual_type, accrual_rate, priority) VALUES ($1, $2, $3, $4, $5, $6)",
            [tenantId, leaveTypeId, 'Default Annual Policy', 'MONTHLY', 1.5, 100]
        );

        // Add balances for all 10 employees
        for (const email in emailToEmployeeIdMap) {
            const empId = emailToEmployeeIdMap[email];
            await client.query(
                "INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, opening_balance, accrued) VALUES ($1, $2, $3, $4, $5, $6)",
                [tenantId, empId, leaveTypeId, new Date().getFullYear(), 10, 5]
            );
        }

        await client.query("COMMIT");
        console.log("Successfully seeded 10 employees with hierarchy and leave balances.");
        console.log("Credentials (Password for all: Password123!):");
        usersData.forEach(d => console.log(`- ${d.email} (${d.role}, reports to: ${d.reportsToEmail || 'None'})`));

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error seeding data:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
