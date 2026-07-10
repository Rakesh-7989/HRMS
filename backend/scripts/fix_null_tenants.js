const pool = require('../src/config/db');
require('dotenv').config();

const TARGET_TENANT_ID = '2a729560-f92d-48fe-8ad0-aa67c3083b15'; // WellZo Tenant

async function fixTenants() {
    const client = await pool.connect();
    try {
        console.log("--- FIXING NULL TENANTS ---");

        // Find count before
        const before = await client.query(`SELECT count(*) FROM users WHERE tenant_id IS NULL AND is_deleted = false`);
        console.log(`Found ${before.rows[0].count} users with NULL tenant_id.`);

        if (parseInt(before.rows[0].count) > 0) {
            // Update
            const res = await client.query(`
            UPDATE users 
            SET tenant_id = $1, updated_at = NOW()
            WHERE tenant_id IS NULL AND is_deleted = false
            RETURNING id, email
        `, [TARGET_TENANT_ID]);

            console.log(`Updated ${res.rowCount} users:`);
            console.log(JSON.stringify(res.rows, null, 2));
        } else {
            console.log("No users to fix.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
}

fixTenants();
