const db = require('../src/config/db');

async function checkTables() {
    try {
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('employees', 'employee_salary_details', 'employee_expenses', 'payroll_runs', 'payroll_run_items')
        `);
        console.log('Found tables:', res.rows.map(r => r.table_name).sort().join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
