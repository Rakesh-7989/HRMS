const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function runMigration() {
    const migrationPath = path.join(__dirname, 'migrations', '001_add_employee_count_and_update_fees.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log('--- STARTING MIGRATION ---');
        await pool.query(sql);
        console.log('✅ MIGRATION SUCCESSFUL');
        
        // Final Verification
        const resFees = await pool.query("SELECT name, setup_fee FROM plans WHERE name IN ('CUSTOM', 'PREMIUM', 'ELITE')");
        console.log('Current Setup Fees:', resFees.rows);
        
        const resCol = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'employee_count'");
        console.log('Employee Count Column Exists:', resCol.rowCount > 0);

    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
