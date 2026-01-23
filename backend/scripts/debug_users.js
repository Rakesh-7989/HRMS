
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function debugUsers() {
    try {
        const users = await pool.query(`
            SELECT u.id as user_id, u.email, u.role, e.id as employee_id, e.first_name, e.last_name
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE u.email LIKE '%employee%' OR u.email LIKE '%hr%' OR u.role IN ('EMPLOYEE', 'HR', 'ADMIN')
        `);

        const content = JSON.stringify(users.rows, null, 2);
        fs.writeFileSync(path.join(__dirname, 'debug_output.json'), content);
        console.log("Debug output written to debug_output.json");
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

debugUsers();
