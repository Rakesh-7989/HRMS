const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log('Checking database schema...');

        // Add carry forward columns to leave_policies
        await pool.query(`
            ALTER TABLE leave_policies 
            ADD COLUMN IF NOT EXISTS carry_forward_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS max_carry_forward NUMERIC(10, 2) DEFAULT 0
        `);
        console.log('Added carry forward columns to leave_policies');

        // Check columns in leave_balances
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leave_balances'
        `);
        console.log('Columns in leave_balances:', res.rows.map(r => r.column_name).join(', '));

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
