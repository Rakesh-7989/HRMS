const { Pool } = require("pg");
const connectionString = "postgresql://hrms_user:admin@localhost:5432/hrms_saas_db";
const pool = new Pool({ connectionString });

async function check() {
    const tenantId = '0588d0d7-c816-42c1-be84-9453b75a1f62';
    const res = await pool.query(`
        SELECT u.email, u.role, e.id as emp_id 
        FROM users u 
        LEFT JOIN employees e ON e.user_id = u.id 
        WHERE u.tenant_id = $1 AND u.is_deleted = false
    `, [tenantId]);

    console.log("Users in Primary Tenant:");
    res.rows.forEach(r => console.log(`- ${r.email} (${r.role}) - EMP_ID: ${r.emp_id}`));

    const leaveRes = await pool.query(`
        SELECT la.id, e.first_name, la.status, e.reports_to 
        FROM leave_applications la
        JOIN employees e ON la.employee_id = e.id
        WHERE la.tenant_id = $1 AND la.status = 'PENDING'
    `, [tenantId]);

    console.log("\nPending Leaves:");
    leaveRes.rows.forEach(r => console.log(`- Request ${r.id} for ${r.first_name}, reports to: ${r.reports_to}`));

    await pool.end();
}
check();
