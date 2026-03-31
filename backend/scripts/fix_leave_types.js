const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hrms_user:root@localhost:5432/hrms_saas_db';

async function seedLeaveTypes() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('🔌 Connected to database');

        // 1. Get all active tenants
        const tenantsRes = await client.query(`SELECT id, name FROM tenants WHERE is_active = true`);
        const tenants = tenantsRes.rows;

        if (tenants.length === 0) {
            console.log('❌ No active tenants found.');
            return;
        }

        console.log(`🏢 Found ${tenants.length} tenants. Checking leave types...`);

        const leaveTypes = [
            { name: 'Annual Leave', code: 'AL', description: 'Paid annual vacation', is_paid: true },
            { name: 'Sick Leave', code: 'SL', description: 'Medical sick leave', is_paid: true },
            { name: 'Casual Leave', code: 'CL', description: 'Personal casual leave', is_paid: true },
            { name: 'Work From Home', code: 'WFH', description: 'Remote work request', is_paid: true }, // Verified WFH
            { name: 'Unpaid Leave', code: 'UL', description: 'Leave without pay', is_paid: false }
        ];

        for (const tenant of tenants) {
            console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`);

            for (const type of leaveTypes) {
                // Check if exists
                const check = await client.query(
                    `SELECT id FROM leave_types WHERE tenant_id = $1 AND code = $2`,
                    [tenant.id, type.code]
                );

                if (check.rowCount === 0) {
                    await client.query(
                        `INSERT INTO leave_types (tenant_id, name, code, description, is_paid, is_active)
                         VALUES ($1, $2, $3, $4, $5, true)`,
                        [tenant.id, type.name, type.code, type.description, type.is_paid]
                    );
                    console.log(`   ✅ Added ${type.name}`);
                } else {
                    console.log(`   🔹 ${type.name} already exists`);
                }
            }
        }

        console.log('\n✨ Database updated successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

seedLeaveTypes();
