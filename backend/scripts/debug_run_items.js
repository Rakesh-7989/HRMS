const db = require('../src/config/db');

async function checkCols() {
    try {
        console.log('--- Payroll Run Items Columns ---');
        const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'payroll_run_items'`);
        console.log(cols.rows.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkCols();
