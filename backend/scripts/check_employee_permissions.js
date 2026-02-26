const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkEmployeePermissions() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT r.name as role_name, p.name as permission_name, p.category
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = 'EMPLOYEE' AND r.tenant_id IS NULL
      ORDER BY p.category, p.name
    `);

        console.log(`EMPLOYEE Role Permissions (${res.rowCount}):`);
        res.rows.forEach(row => {
            console.log(`- [${row.category}] ${row.permission_name}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        pool.end();
    }
}

checkEmployeePermissions();
