const db = require('../src/config/db');

async function checkData() {
    try {
        console.log('--- Employee Salary Details Columns ---');
        const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employee_salary_details'`);
        console.log(cols.rows.map(r => r.column_name).join(', '));

        console.log('\n--- Employees Data Check ---');
        const countAll = await db.query('SELECT COUNT(*) FROM employees');
        console.log('Total Employees (no filter):', countAll.rows[0].count);

        if (parseInt(countAll.rows[0].count) > 0) {
            const sample = await db.query('SELECT id, tenant_id, status FROM employees LIMIT 3');
            console.log('Sample Employees:', JSON.stringify(sample.rows, null, 2));

            // Check status distinct values
            const statuses = await db.query('SELECT DISTINCT status FROM employees');
            console.log('Distinct Statuses:', statuses.rows.map(r => r.status).join(', '));
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkData();
