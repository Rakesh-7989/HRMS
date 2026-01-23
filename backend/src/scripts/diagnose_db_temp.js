const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnose() {
    const client = await pool.connect();
    try {
        const table = 'employees';
        console.log(`\n--- Columns for ${table} ---`);
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY column_name;
    `, [table]);

        if (res.rows.length === 0) {
            console.log(`Table '${table}' NOT FOUND or has no columns.`);
        } else {
            res.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type})`);
            });
        }

    } catch (err) {
        console.error('Diagnosis failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
