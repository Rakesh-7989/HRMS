const { Pool } = require("pg");
const connectionString = "postgresql://hrms_user:admin@localhost:5432/hrms_saas_db";
const pool = new Pool({ connectionString });

async function check() {
    const res = await pool.query("SELECT id, name FROM tenants");
    console.log("Tenants:");
    res.rows.forEach(r => console.log(`- ${r.id}: ${r.name}`));

    const userRes = await pool.query("SELECT tenant_id, COUNT(*) FROM users GROUP BY tenant_id");
    console.log("\nUser distribution:");
    userRes.rows.forEach(r => console.log(`- Tenant ${r.tenant_id}: ${r.count} users`));

    await pool.end();
}
check();
