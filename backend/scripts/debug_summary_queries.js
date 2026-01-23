const db = require('../src/config/db');

async function debugSummary() {
    try {
        console.log('--- Checking Employees Table Schema ---');
        const schemaRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees'
        `);
        console.log('Employees Columns:', schemaRes.rows.map(r => r.column_name).join(', '));

        console.log('\n--- Testing Payroll Summary Queries ---');

        // Mock Tenant ID (we just want to see if SQL syntax is valid)
        // We'll trust the RLS or just pass a dummy UUID. 
        // Note: db.query in db.js expects a context maybe? No, it handles it gracefully if missing usually, 
        // but let's see. The db.js wrapper might fail if asyncContext is empty?
        // "if (!store) return;" in withContext avoids crash.
        const tenantId = '00000000-0000-0000-0000-000000000000';

        // 1. Employees Count
        console.log('1. Testing Employees Count Query...');
        try {
            await db.query(`SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND status = 'ACTIVE'`, [tenantId]);
            console.log('   MATCH: Success');
        } catch (e) {
            console.error('   FAIL:', e.message);
        }

        // 2. Salary Details
        console.log('2. Testing Salary Details Query...');
        try {
            await db.query(`SELECT COALESCE(SUM(ctc/12), 0) as monthly_payroll FROM employee_salary_details WHERE tenant_id = $1 AND is_current = TRUE`, [tenantId]);
            console.log('   MATCH: Success');
        } catch (e) {
            console.error('   FAIL:', e.message);
        }

        // 3. Pending Payslips
        console.log('3. Testing Pending Payslips Query...');
        try {
            await db.query(`
                SELECT COUNT(*) FROM payroll_run_items pri
                JOIN payroll_runs pr ON pr.id = pri.payroll_run_id
                WHERE pri.tenant_id = $1 AND pr.status IN ('DRAFT', 'PENDING_APPROVAL')
            `, [tenantId]);
            console.log('   MATCH: Success');
        } catch (e) {
            console.error('   FAIL:', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Global Debug Error:', err);
        process.exit(1);
    }
}

debugSummary();
