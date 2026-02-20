/**
 * RBAC Fix Script — Production
 * 
 * Fixes:
 *   1. Clones system roles to each tenant
 *   2. Backfills user_roles for ALL existing users
 * 
 * Run: node scripts/fix_rbac.js
 * Safe to run multiple times (idempotent).
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Client } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: isProduction ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || "5432", 10),
    };

async function fixRbac() {
    const client = new Client(dbConfig);
    await client.connect();

    console.log("🔧 RBAC FIX SCRIPT");
    console.log("═".repeat(60));

    try {
        await client.query("BEGIN");

        // ──────────────────────────────────────────────────────────
        // STEP 1: Clone system roles to each tenant
        // ──────────────────────────────────────────────────────────
        console.log("\n📋 Step 1: Cloning system roles to tenants...");

        const tenants = await client.query("SELECT id, name FROM tenants");
        const systemRoles = await client.query(
            "SELECT id, name, description, role_type FROM roles WHERE tenant_id IS NULL"
        );

        // Only clone ADMIN, EMPLOYEE, HR, MANAGER (not SUPER_ADMIN which is platform-level)
        const cloneableRoles = systemRoles.rows.filter(r => r.name !== 'SUPER_ADMIN');

        let rolesCreated = 0;
        let permsCopied = 0;

        for (const tenant of tenants.rows) {
            for (const sysRole of cloneableRoles) {
                // Check if this tenant already has this role
                const existing = await client.query(
                    "SELECT id FROM roles WHERE tenant_id = $1 AND name = $2",
                    [tenant.id, sysRole.name]
                );

                if (existing.rowCount > 0) {
                    console.log(`   ⏭️  ${tenant.name}: ${sysRole.name} already exists`);
                    continue;
                }

                // Create the tenant-specific role
                const newRole = await client.query(
                    `INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable)
                     VALUES ($1, $2, $3, 'SYSTEM', false, true)
                     RETURNING id`,
                    [tenant.id, sysRole.name, sysRole.description]
                );

                const newRoleId = newRole.rows[0].id;
                rolesCreated++;

                // Copy all role_permissions from the system role to the tenant role
                const copyResult = await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     SELECT $1, permission_id FROM role_permissions WHERE role_id = $2
                     ON CONFLICT DO NOTHING`,
                    [newRoleId, sysRole.id]
                );
                permsCopied += copyResult.rowCount;

                console.log(`   ✅ ${tenant.name}: Created ${sysRole.name} (${copyResult.rowCount} permissions)`);
            }
        }

        console.log(`   📊 Created ${rolesCreated} tenant roles, copied ${permsCopied} permission assignments`);

        // ──────────────────────────────────────────────────────────
        // STEP 2: Backfill user_roles for all users
        // ──────────────────────────────────────────────────────────
        console.log("\n📋 Step 2: Backfilling user_roles...");

        const users = await client.query(
            "SELECT id, email, role, tenant_id FROM users WHERE is_deleted = false AND role IS NOT NULL"
        );

        let assigned = 0;
        let skipped = 0;
        let failed = 0;

        for (const user of users.rows) {
            // Check if user already has a user_roles entry
            const existingUR = await client.query(
                "SELECT id FROM user_roles WHERE user_id = $1",
                [user.id]
            );

            if (existingUR.rowCount > 0) {
                console.log(`   ⏭️  ${user.email}: already has user_roles entry`);
                skipped++;
                continue;
            }

            // Find the matching role
            let roleId = null;

            if (user.role === 'SUPER_ADMIN') {
                // Super Admin uses the system-level SUPER_ADMIN role (tenant_id IS NULL)
                const roleRes = await client.query(
                    "SELECT id FROM roles WHERE name = 'SUPER_ADMIN' AND tenant_id IS NULL"
                );
                if (roleRes.rowCount > 0) roleId = roleRes.rows[0].id;
            } else if (user.tenant_id) {
                // Tenant users: use the tenant-specific role first
                const roleRes = await client.query(
                    "SELECT id FROM roles WHERE name = $1 AND tenant_id = $2",
                    [user.role, user.tenant_id]
                );
                if (roleRes.rowCount > 0) {
                    roleId = roleRes.rows[0].id;
                } else {
                    // Fallback to system role if tenant role doesn't exist
                    const sysRes = await client.query(
                        "SELECT id FROM roles WHERE name = $1 AND tenant_id IS NULL",
                        [user.role]
                    );
                    if (sysRes.rowCount > 0) roleId = sysRes.rows[0].id;
                }
            }

            if (!roleId) {
                console.log(`   ⚠️  ${user.email}: No matching role found for "${user.role}"`);
                failed++;
                continue;
            }

            // Insert user_roles entry
            await client.query(
                `INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT DO NOTHING`,
                [user.id, roleId, user.tenant_id]
            );

            assigned++;
            console.log(`   ✅ ${user.email}: Assigned ${user.role} role`);
        }

        console.log(`   📊 Assigned: ${assigned}, Skipped: ${skipped}, Failed: ${failed}`);

        // ──────────────────────────────────────────────────────────
        // STEP 3: Verify
        // ──────────────────────────────────────────────────────────
        console.log("\n📋 Step 3: Verification...");

        const verifyUR = await client.query("SELECT COUNT(*) as count FROM user_roles");
        const verifyRoles = await client.query("SELECT COUNT(*) as count FROM roles WHERE tenant_id IS NOT NULL");

        console.log(`   user_roles: ${verifyUR.rows[0].count} records`);
        console.log(`   tenant roles: ${verifyRoles.rows[0].count} records`);

        // Quick permission check for one user
        const sampleUser = await client.query(`
            SELECT u.email, u.role, COUNT(DISTINCT p.name) as perm_count
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE u.is_deleted = false
            GROUP BY u.email, u.role
            ORDER BY perm_count DESC
            LIMIT 3
        `);

        console.log("   Top users by permissions:");
        sampleUser.rows.forEach(u => {
            console.log(`     ${u.email} (${u.role}): ${u.perm_count} permissions`);
        });

        await client.query("COMMIT");

        console.log("\n" + "═".repeat(60));
        console.log("✅ RBAC fix completed successfully!");
        console.log("═".repeat(60));
        console.log("\n💡 Next steps:");
        console.log("   1. Restart your backend server");
        console.log("   2. Clear browser localStorage/sessionStorage");
        console.log("   3. Login again — sidebar should now show all items");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("\n❌ Fix failed, rolled back:", err.message);
        throw err;
    } finally {
        await client.end();
    }
}

fixRbac().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
