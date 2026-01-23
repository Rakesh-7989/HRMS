// scripts/run-demo-seed.js
// Run with: node scripts/run-demo-seed.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hrms_user:root@localhost:5432/hrms_saas_db';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runSeed() {
    console.log('🚀 Starting demo data seed...');
    console.log('📡 Connecting to database...');

    const client = await pool.connect();

    try {
        const seedPath = path.join(__dirname, '../src/database/seed/seed_demo_data.sql');
        const sql = fs.readFileSync(seedPath, 'utf8');

        console.log('📄 Reading seed file...');
        console.log('⏳ Executing SQL...');

        await client.query(sql);

        console.log('✅ Demo data seeded successfully!');
        console.log('\n📊 Summary:');

        // Show summary
        const deptCount = await client.query('SELECT COUNT(*) FROM departments');
        const empCount = await client.query('SELECT COUNT(*) FROM employees');
        const attCount = await client.query('SELECT COUNT(*) FROM attendance');
        const leaveCount = await client.query('SELECT COUNT(*) FROM leave_applications');
        const leaveTypeCount = await client.query('SELECT COUNT(*) FROM leave_types');

        console.log(`   - Departments: ${deptCount.rows[0].count}`);
        console.log(`   - Employees: ${empCount.rows[0].count}`);
        console.log(`   - Leave Types: ${leaveTypeCount.rows[0].count}`);
        console.log(`   - Attendance Records: ${attCount.rows[0].count}`);
        console.log(`   - Leave Applications: ${leaveCount.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error seeding demo data:', err.message);
        if (err.detail) console.error('   Detail:', err.detail);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runSeed();
