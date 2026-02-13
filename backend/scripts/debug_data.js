require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkData() {
    try {
        // 1. Check total records
        const resCount = await pool.query('SELECT COUNT(*) FROM attendance');
        console.log("Total attendance records:", resCount.rows[0].count);

        // 2. Check recent records
        const resRecent = await pool.query(`
      SELECT date, employee_id, check_in_time, status, effective_work_hours, overtime_hours 
      FROM attendance 
      ORDER BY date DESC 
      LIMIT 5
    `);
        console.log("Recent 5 records:");
        console.table(resRecent.rows);

        // 3. Check for specific date range (last 7 days approx)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        console.log(`Checking records since ${dateStr}...`);
        const resRange = await pool.query(`
        SELECT count(*) 
        FROM attendance 
        WHERE date >= $1
    `, [dateStr]);
        console.log("Records in last 7 days:", resRange.rows[0].count);

        // 4. Check if tenant_id might be an issue (list unique tenant_ids)
        const resTenants = await pool.query('SELECT DISTINCT tenant_id FROM attendance');
        console.log("Tenant IDs in attendance:", resTenants.rows.map(r => r.tenant_id));

    } catch (err) {
        console.error("Error querying data:", err);
    } finally {
        await pool.end();
    }
}

checkData();
