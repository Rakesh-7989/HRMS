const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = "postgresql://hrms_user:admin@localhost:5432/hrms_saas_db";
const pool = new Pool({ connectionString });

async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const tenantId = '0588d0d7-c816-42c1-be84-9453b75a1f62';
        console.log(`Targeting Primary Tenant: ${tenantId}`);

        // Get an existing Admin/HR as top level root for these tests if possible
        const rootRes = await client.query(
            "SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.tenant_id = $1 AND u.role = 'ADMIN' LIMIT 1",
            [tenantId]
        );
        const rootId = rootRes.rowCount > 0 ? rootRes.rows[0].id : null;

        const suffix = "v2";
        const passwordHash = await bcrypt.hash("Password123!", 10);

        // 10 People: 1 HR, 2 Managers, 7 Employees
        const usersData = [
            { email: `hr_test@test.com`, role: 'HR', firstName: 'HR', lastName: 'Officer', empId: `HR-001`, reportsToId: rootId },
            { email: `manager_a@test.com`, role: 'MANAGER', firstName: 'Manager', lastName: 'A', empId: `MGR-A`, reportsToId: rootId },
            { email: `manager_b@test.com`, role: 'MANAGER', firstName: 'Manager', lastName: 'B', empId: `MGR-B`, reportsToId: rootId },

            { email: `staff_1@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'One', empId: `STF-01`, reportsToEmail: `manager_a@test.com` },
            { email: `staff_2@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Two', empId: `STF-02`, reportsToEmail: `manager_a@test.com` },
            { email: `staff_3@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Three', empId: `STF-03`, reportsToEmail: `hr_test@test.com` },
            { email: `staff_4@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Four', empId: `STF-04`, reportsToEmail: `manager_b@test.com` },
            { email: `staff_5@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Five', empId: `STF-05`, reportsToEmail: `manager_b@test.com` },
            { email: `staff_6@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Six', empId: `STF-06`, reportsToEmail: `hr_test@test.com` },
            { email: `staff_7@test.com`, role: 'EMPLOYEE', firstName: 'Staff', lastName: 'Seven', empId: `STF-07`, reportsToEmail: `manager_a@test.com` },
        ];

        const emailToEmpId = {};

        // Create Users & Employees
        for (const data of usersData) {
            // Delete if already exists to avoid conflict in same tenant
            await client.query("DELETE FROM users WHERE tenant_id = $1 AND email = $2", [tenantId, data.email]);

            const userRes = await client.query(
                "INSERT INTO users (tenant_id, email, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [tenantId, data.email, passwordHash, data.role, false]
            );
            const userId = userRes.rows[0].id;

            const empRes = await client.query(
                "INSERT INTO employees (tenant_id, user_id, first_name, last_name, employee_id, status) VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING id",
                [tenantId, userId, data.firstName, data.lastName, data.empId]
            );
            emailToEmpId[data.email] = empRes.rows[0].id;

            if (data.reportsToId) {
                await client.query("UPDATE employees SET reports_to = $1 WHERE id = $2", [data.reportsToId, empRes.rows[0].id]);
            }
        }

        // Link Reports To (for those with email reference)
        for (const data of usersData) {
            if (data.reportsToEmail) {
                const mgrId = emailToEmpId[data.reportsToEmail];
                const myId = emailToEmpId[data.email];
                await client.query("UPDATE employees SET reports_to = $1 WHERE id = $2", [mgrId, myId]);
            }
        }

        // Add Leave Balances & Types
        let leaveTypeRes = await client.query("SELECT id FROM leave_types WHERE tenant_id = $1 AND code = 'AL' LIMIT 1", [tenantId]);
        let leaveTypeId;
        if (leaveTypeRes.rowCount === 0) {
            const res = await client.query(
                "INSERT INTO leave_types (tenant_id, name, code, is_paid, requires_approval) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [tenantId, 'Annual Leave', 'AL', true, true]
            );
            leaveTypeId = res.rows[0].id;
        } else {
            leaveTypeId = leaveTypeRes.rows[0].id;
        }

        for (const email in emailToEmpId) {
            const empId = emailToEmpId[email];
            await client.query(
                "INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, opening_balance, accrued) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, employee_id, leave_type_id, year) DO UPDATE SET opening_balance = 15",
                [tenantId, empId, leaveTypeId, 2026, 15, 0]
            );
        }

        // Create 3 PENDING Leave Applications
        // 1. staff_1 (Manager A)
        await client.query(
            "INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [tenantId, emailToEmpId['staff_1@test.com'], leaveTypeId, '2026-02-01', '2026-02-03', 3, 'PENDING', 'Testing Manager Approval']
        );
        // 2. staff_3 (HR Officer)
        await client.query(
            "INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [tenantId, emailToEmpId['staff_3@test.com'], leaveTypeId, '2026-02-05', '2026-02-06', 2, 'PENDING', 'Testing HR as Manager']
        );
        // 3. manager_a (Root/Admin)
        await client.query(
            "INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [tenantId, emailToEmpId['manager_a@test.com'], leaveTypeId, '2026-02-10', '2026-02-12', 3, 'PENDING', 'Testing Admin Approval']
        );

        await client.query("COMMIT");
        console.log("SUCCESS: Seeded 10 employees into 'Seed Tenant' with hierarchy and pending requests.");
        console.log("\nLOGIN LIST (Password: Password123!):");
        console.log("1. HR Dashboard Testing: Logs in as hr_test@test.com (Can see organization stats)");
        console.log("2. Approval Testing (Manager): Logs in as manager_a@test.com (Can see staff_1 request)");
        console.log("3. Approval Testing (HR as Mgr): Logs in as hr_test@test.com (Can see staff_3 request)");
        console.log("4. Restriction Testing: hr_test@test.com cannot see staff_1 request in Team Leave.");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error seeding:", err);
    } finally {
        client.release();
        await pool.end();
    }
}
seed();
