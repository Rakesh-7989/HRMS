const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    try {
        await pool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS eod_report TEXT');
        console.log('✅ eod_report column added to attendance table');

        const result = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'eod_report'"
        );
        console.log('Verification:', result.rows.length > 0 ? 'Column exists ✅' : 'Column missing ❌');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

run();
