const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runVerification() {
    const client = await pool.connect();
    try {
        console.log("Starting verification...");

        // Cleanup previous test data
        await client.query("DELETE FROM tenants WHERE email LIKE 'test_tenant_%@example.com'");

        // 1. Create Tenant A
        const tenantA = await client.query(`
      INSERT INTO tenants (name, email, is_active) 
      VALUES ('Test Tenant A', 'test_tenant_a@example.com', true) 
      RETURNING id
    `);
        const tenantAId = tenantA.rows[0].id;
        console.log("Created Tenant A:", tenantAId);

        // 2. Create Tenant B
        const tenantB = await client.query(`
      INSERT INTO tenants (name, email, is_active) 
      VALUES ('Test Tenant B', 'test_tenant_b@example.com', true) 
      RETURNING id
    `);
        const tenantBId = tenantB.rows[0].id;
        console.log("Created Tenant B:", tenantBId);

        // Create Dummy Users for FK
        const userA = await client.query(`INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, 'user.a@example.com', 'hash', 'ADMIN') RETURNING id`, [tenantAId]);
        const userB = await client.query(`INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, 'user.b@example.com', 'hash', 'ADMIN') RETURNING id`, [tenantBId]);
        const userA2 = await client.query(`INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, 'user.a2@example.com', 'hash', 'ADMIN') RETURNING id`, [tenantAId]);

        // 3. Insert ID in Tenant A
        await client.query(`
      INSERT INTO employees (tenant_id, user_id, employee_id, first_name)
      VALUES ($1, $2, 'EMP-COMMON', 'Employee A')
    `, [tenantAId, userA.rows[0].id]);
        console.log("✅ Inserted EMP-COMMON in Tenant A");

        // 4. Insert ID in Tenant B (Should Success)
        try {
            await client.query(`
        INSERT INTO employees (tenant_id, user_id, employee_id, first_name)
        VALUES ($1, $2, 'EMP-COMMON', 'Employee B')
      `, [tenantBId, userB.rows[0].id]);
            console.log("✅ Inserted EMP-COMMON in Tenant B (Success - Per Tenant Isolation Verified)");
        } catch (err) {
            console.error("❌ Failed to insert EMP-COMMON in Tenant B:", err.message);
        }

        // 5. Insert Duplicate in Tenant A (Should Fail)
        let failedAsExpected = false;
        try {
            await client.query(`
        INSERT INTO employees (tenant_id, user_id, employee_id, first_name)
        VALUES ($1, $2, 'EMP-COMMON', 'Employee A Duplicate')
      `, [tenantAId, userA2.rows[0].id]);
        } catch (err) {
            if (err.constraint === 'employees_tenant_id_employee_id_key' || err.code === '23505') {
                failedAsExpected = true;
                console.log("✅ Correctly rejected duplicate EMP-COMMON in Tenant A");
            } else {
                console.error("❌ Failed with unexpected error:", err);
            }
        }

        if (!failedAsExpected) {
            console.error("❌ Tenant A duplicate insert should have failed but succeeded!");
        }

        // 6. Test Smart Counter
        const tenantService = require('../src/modules/tenant/tenant.service');

        // Configure prefix
        await tenantService.setEmployeeIdPrefix(tenantAId, 'EMP');
        console.log("Configured prefix EMP for Tenant A");

        // Simulate creating a user via service (mocking the service logic slightly)
        await tenantService.syncEmployeeIdCounter(tenantAId, 'EMP005', client);

        const settingsRes = await client.query(`SELECT settings FROM tenants WHERE id = $1`, [tenantAId]);
        const counter = settingsRes.rows[0].settings.employee_id_counter;

        if (counter === 5) {
            console.log("✅ Smart counter synced correctly to 5");
        } else {
            console.error(`❌ Smart counter failed sync. Expected 5, got ${counter}`);
        }

        // Generate next
        const nextId = await tenantService.generateNextEmployeeId(tenantAId, client);
        if (nextId === 'EMP006') {
            console.log("✅ Next generated ID is EMP006");
        } else {
            console.error(`❌ Next generated ID is wrong. Expected EMP006, got ${nextId}`);
        }

    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        // Cleanup
        await client.query("DELETE FROM tenants WHERE email LIKE 'test_tenant_%@example.com'");
        client.release();
        pool.end();
    }
}

runVerification();
