const { Client } = require('pg');
const env = require('../src/config/env');

async function seedStatutoryConfig() {
    const client = new Client({ connectionString: env.DATABASE_URL });

    try {
        await client.connect();

        // Get tenant
        const tenants = await client.query('SELECT id FROM tenants LIMIT 1');
        const tenantId = tenants.rows[0]?.id;

        if (!tenantId) {
            console.log('No tenant found');
            return;
        }

        // Delete existing config if any
        await client.query('DELETE FROM statutory_config WHERE tenant_id = $1', [tenantId]);

        // Insert statutory config
        await client.query(`
            INSERT INTO statutory_config (
                tenant_id, 
                pf_enabled, 
                pf_employee_rate, 
                pf_employer_rate, 
                pf_wage_ceiling, 
                esi_enabled, 
                esi_employee_rate, 
                esi_employer_rate, 
                esi_wage_ceiling, 
                pt_enabled, 
                pt_state
            ) VALUES (
                $1, 
                true, 
                12, 
                12, 
                15000, 
                true, 
                0.75, 
                3.25, 
                21000, 
                true, 
                'Telangana'
            )
        `, [tenantId]);

        console.log('✅ Statutory config created/updated for tenant:', tenantId);
        console.log('   - PF Enabled: true (12% employee, 12% employer)');
        console.log('   - ESI Enabled: true (0.75% employee, 3.25% employer)');
        console.log('   - PT State: Telangana');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

seedStatutoryConfig();
