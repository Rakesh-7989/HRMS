const pool = require('../src/config/db');
const superAdminService = require('../src/modules/super_admin/superAdmin.service');
const asyncContext = require('../src/utils/asyncContext');

async function testSuperAdmin() {
    console.log('--- Testing Super Admin Access ---');

    // Mock the Async Context that middleware typically provides
    const store = new Map();
    store.set('role', 'SUPER_ADMIN');
    store.set('tenantId', null);
    // RLS logic in db.js checks store.get('role') === 'SUPER_ADMIN' to set app.role='SUPER_ADMIN' and app.tenant_id=NULL

    await asyncContext.run(store, async () => {
        try {
            console.log('1. Fetching All Tenants...');
            // By passing nothing to service (which expects (db) or uses default), it uses default dbQuery
            // dbQuery uses pool.connect -> withContext -> reads store -> sets RLS
            const tenants = await superAdminService.getAllTenants();
            console.log(`PASS: Found ${tenants.length} tenants.`);

            if (tenants.length > 0) {
                const tenantId = tenants[0].id;
                console.log(`2. Fetching Users for Tenant: ${tenants[0].name} (${tenantId})...`);
                const users = await superAdminService.getUsersByTenant(undefined, tenantId); // undefined db uses default
                console.log(`PASS: Found ${users.length} users for tenant.`);

                console.log('3. Fetching Global Employee Count...');
                const count = await superAdminService.getEmployeeCount();
                console.log(`PASS: Total Employees: ${count}`);
            } else {
                console.warn('WARN: No tenants found, cannot test user fetch.');
            }

        } catch (err) {
            console.error('FAIL: Error during Super Admin operations:', err);
        } finally {
            await pool.end();
        }
    });
}

testSuperAdmin();
