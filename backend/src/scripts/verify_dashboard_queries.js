const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB.');

        // Get a valid tenant and employee
        const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
        const employeeRes = await client.query('SELECT id FROM employees LIMIT 1');

        if (tenantRes.rows.length === 0 || employeeRes.rows.length === 0) {
            console.log('No tenant or employee found to test with.');
            return;
        }

        const tenantId = tenantRes.rows[0].id;
        const employeeId = employeeRes.rows[0].id;

        console.log(`Testing with Tenant: ${tenantId}, Employee: ${employeeId}`);

        // 1. Test getHRDashboard -> leaveTypeDistribution
        console.log('\nTesting leaveTypeDistribution query...');
        await client.query(`
    SELECT
      lt.name AS leave_type,
      COUNT(la.id) AS count,
      COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved_count,
      AVG(CAST(la.end_date - la.start_date AS INTEGER)) AS avg_duration_days
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.tenant_id=$1
    AND la.created_at > NOW() - INTERVAL '90 days'
    GROUP BY lt.name
    ORDER BY count DESC
    `, [tenantId]);
        console.log('SUCCESS: leaveTypeDistribution query ran without error.');

        // 2. Test getEmployeeDashboard -> leaveHistory
        console.log('\nTesting leaveHistory query...');
        await client.query(`
    SELECT
      la.id,
      lt.name AS leave_type,
      la.start_date,
      la.end_date,
      la.is_half_day,
      la.half_day_session,
      la.status,
      la.reason,
      la.created_at,
      la.updated_at
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = $1
    AND la.tenant_id = $2
    ORDER BY la.created_at DESC
    LIMIT 15
    `, [employeeId, tenantId]);
        console.log('SUCCESS: leaveHistory query ran without error.');

        // 3. Test getEmployeeDashboard -> upcomingEvents
        console.log('\nTesting upcomingEvents query...');
        await client.query(`
    SELECT
      la.id,
      lt.name AS leave_type,
      la.start_date,
      la.end_date,
      la.is_half_day,
      la.status
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = $1
    AND la.tenant_id = $2
    AND la.start_date >= CURRENT_DATE
    ORDER BY la.start_date ASC
    LIMIT 10
    `, [employeeId, tenantId]);
        console.log('SUCCESS: upcomingEvents query ran without error.');

    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
