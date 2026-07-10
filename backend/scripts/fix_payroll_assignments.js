const db = require('../src/config/db');

async function fixPayrollAssignments() {
    console.log('🔧 Fixing Payroll Assignments...');
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Tenant
        const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
        const tenantId = tenantRes.rows[0].id;
        console.log(`📌 Tenant ID: ${tenantId}`);

        // 2. Get Standard Salary Structure
        const structRes = await client.query(
            `SELECT id, name FROM salary_structures WHERE tenant_id = $1 AND name LIKE '%Standard%' LIMIT 1`,
            [tenantId]
        );

        if (structRes.rowCount === 0) {
            console.log('❌ No Standard Structure found. Please run seed_salary_structure.js first.');
            process.exit(1);
        }

        const structureId = structRes.rows[0].id;
        console.log(`✅ Using Structure: ${structRes.rows[0].name} (${structureId})`);

        // 3. Find Active Employees WITHOUT Current Assignment
        const missingRes = await client.query(`
            SELECT e.id, e.first_name, e.last_name, e.join_date, 
                   COALESCE(esd.ctc, 600000) as ctc -- Default to 6L if no CTC
            FROM employees e
            LEFT JOIN employee_salary_details esd ON esd.employee_id = e.id AND esd.is_current = TRUE
            LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.id AND esa.is_current = TRUE
            WHERE e.tenant_id = $1 
              AND e.status = 'ACTIVE' 
              AND e.is_deleted = FALSE 
              AND esa.id IS NULL
        `, [tenantId]);

        console.log(`🔍 Found ${missingRes.rowCount} employees needing assignment.`);

        // 4. Assign Them
        const salaryStructureService = require('../src/modules/payroll/salary/salaryStructure.service');

        // Mock userId for audit
        const systemUserIdRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = systemUserIdRes.rows[0].id;

        for (const emp of missingRes.rows) {
            console.log(`   👉 Assigning to: ${emp.first_name} ${emp.last_name} (CTC: ${emp.ctc})`);

            // Using the service directly to ensure breakdown is calculated
            await salaryStructureService.assignEmployeeSalary(
                tenantId,
                emp.id,
                {
                    structure_id: structureId,
                    annual_ctc: parseFloat(emp.ctc),
                    effective_from: emp.join_date || new Date().toISOString().split('T')[0],
                    revision_reason: 'System Fix: Auto-Assignment'
                },
                userId
            );
        }

        await client.query('COMMIT');
        console.log('🎉 All assignments fixed!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Fix Failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

fixPayrollAssignments();
