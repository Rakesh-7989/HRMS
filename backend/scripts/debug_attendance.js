
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function debugAttendance() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const records = await pool.query(`
            SELECT a.id, a.date, a.check_in_time, a.status, a.employee_id, e.first_name, e.last_name, u.email
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE a.date = '${today}'
        `);

        const content = JSON.stringify(records.rows, null, 2);
        fs.writeFileSync(path.join(__dirname, 'debug_attendance.json'), content);
        console.log("Written to debug_attendance.json");
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

debugAttendance();
