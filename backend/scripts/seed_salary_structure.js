const db = require('../src/config/db');

async function seedSalary() {
    console.log('🌱 Seeding Salary Components and Templates...');
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the first tenant (assuming single tenant for now or first one found)
        const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
        if (tenantRes.rowCount === 0) {
            console.log('❌ No tenant found. Please create a tenant first.');
            process.exit(1);
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`📌 Using Tenant ID: ${tenantId}`);

        // 2. Define Standard Components
        // These are critical for the system to work. Do not change 'code'.
        const components = [
            { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', taxable: true },
            { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', taxable: true },
            { code: 'DA', name: 'Dearness Allowance', type: 'EARNING', taxable: true },
            { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', taxable: true },
            { code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING', taxable: true },
            { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', taxable: true },
            { code: 'PF_EE', name: 'Provident Fund (Employee)', type: 'DEDUCTION', taxable: false },
            { code: 'PF_ER', name: 'Provident Fund (Employer)', type: 'EMPLOYER_CONTRIBUTION', taxable: false },
            { code: 'PT', name: 'Professional Tax', type: 'DEDUCTION', taxable: false },
            { code: 'TDS', name: 'Tax Deducted at Source', type: 'DEDUCTION', taxable: false },
            { code: 'ESI_EE', name: 'Employee State Insurance (Employee)', type: 'DEDUCTION', taxable: false },
            { code: 'ESI_ER', name: 'Employee State Insurance (Employer)', type: 'EMPLOYER_CONTRIBUTION', taxable: false }
        ];

        const compMap = {};

        for (const comp of components) {
            // Upsert Component
            const res = await client.query(`
                INSERT INTO salary_components (tenant_id, code, name, component_type, is_taxable, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
                ON CONFLICT (tenant_id, code) 
                DO UPDATE SET name = EXCLUDED.name, component_type = EXCLUDED.component_type
                RETURNING id, code;
            `, [tenantId, comp.code, comp.name, comp.type, comp.taxable]);

            compMap[res.rows[0].code] = res.rows[0].id;
            console.log(`✅ Component Upserted: ${comp.name}`);
        }

        // 3. Create Standard Indian Salary Structure
        // 40% Basic, 50% HRA, PF 12%, rest Special.
        const structureName = 'Standard India Salary Structure (New)';

        // Check if exists
        const structCheck = await client.query(
            `SELECT id FROM salary_structures WHERE tenant_id = $1 AND name = $2`,
            [tenantId, structureName]
        );

        let structureId;
        if (structCheck.rowCount > 0) {
            structureId = structCheck.rows[0].id;
            console.log(`ℹ️ Structure '${structureName}' already exists.`);
        } else {
            const structRes = await client.query(`
                INSERT INTO salary_structures (tenant_id, name, description, is_default, is_active)
                VALUES ($1, $2, 'Standard CTC breakdown compliant with India Wage Code', true, true)
                RETURNING id;
            `, [tenantId, structureName]);
            structureId = structRes.rows[0].id;
            console.log(`✅ Created Structure: ${structureName}`);
        }

        // 4. Map Components to Structure
        const structureComponents = [
            { code: 'BASIC', type: 'PERCENTAGE_OF_CTC', val: 40, order: 1 },
            { code: 'HRA', type: 'PERCENTAGE_OF_BASIC', val: 50, order: 2 },
            { code: 'PF_EE', type: 'PERCENTAGE_OF_BASIC', val: 12, max: 1800, order: 3 }, // Capped at 1800 usually
            { code: 'PF_ER', type: 'PERCENTAGE_OF_BASIC', val: 12, max: 1800, order: 4 },
            { code: 'PT', type: 'FIXED', val: 200, order: 5 }, // Standard PT
            { code: 'SPECIAL', type: 'REMAINING', val: 0, order: 6 } // Balancing figure
        ];

        // Clear existing mappings to be safe
        await client.query(`DELETE FROM salary_structure_components WHERE structure_id = $1`, [structureId]);

        for (const sc of structureComponents) {
            if (!compMap[sc.code]) {
                console.warn(`⚠️ Component ${sc.code} not found, skipping association.`);
                continue;
            }

            await client.query(`
                INSERT INTO salary_structure_components 
                (tenant_id, structure_id, component_id, calculation_type, percentage, fixed_amount, max_value, display_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                tenantId,
                structureId,
                compMap[sc.code],
                sc.type,
                sc.type.includes('PERCENTAGE') ? sc.val : 0,
                sc.type === 'FIXED' ? sc.val : 0,
                sc.max || null,
                sc.order
            ]);
            console.log(`   🔗 Linked ${sc.code} to Structure`);
        }

        await client.query('COMMIT');
        console.log('🎉 Seeding Complete! Please refresh your Salary Structure page.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding Failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

seedSalary();
