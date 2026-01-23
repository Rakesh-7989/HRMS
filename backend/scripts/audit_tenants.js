const pool = require('../src/config/db');
const fs = require('fs');
require('dotenv').config();

async function auditData() {
    const client = await pool.connect();
    try {
        console.log("--- TENANT ID AUDIT ---");

        // Check Users
        const users = await client.query(`
        SELECT count(*) as total, 
               count(*) filter (where tenant_id is null) as null_tenant
        FROM users
        WHERE is_deleted = false
    `);

        // Check Departments
        const depts = await client.query(`
        SELECT count(*) as total, 
               count(*) filter (where tenant_id is null) as null_tenant
        FROM departments
    `);

        // Check Designations
        const desigs = await client.query(`
        SELECT count(*) as total, 
               count(*) filter (where tenant_id is null) as null_tenant
        FROM designations
    `);

        // Check Tenants
        const tenants = await client.query(`SELECT id, name FROM tenants`);

        const results = {
            users: users.rows[0],
            departments: depts.rows[0],
            designations: desigs.rows[0],
            tenants: tenants.rows
        };

        fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
        console.log("Audit complete. Results written to audit_results.json");

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
}

auditData();
