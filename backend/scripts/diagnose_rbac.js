/**
 * RBAC Diagnostic Script
 * Checks the state of all RBAC tables and identifies missing data.
 * Run: node scripts/diagnose_rbac.js
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

async function diagnose() {
    const client = new Client(dbConfig);
    await client.connect();

    console.log("🔍 RBAC DIAGNOSTIC REPORT");
    console.log("═".repeat(60));

    // 1. Check permissions table
    const perms = await client.query("SELECT COUNT(*) as count FROM permissions");
    console.log(`\n📋 Permissions table: ${perms.rows[0].count} records`);

    if (parseInt(perms.rows[0].count) === 0) {
        console.log("❌ CRITICAL: No permissions found! The RBAC migration data is missing.");
        console.log("   The migration file may have been recorded as executed but failed silently.");
        console.log("   FIX: Re-run the RBAC seed manually (see below).");
    }

    // 2. Check roles table
    const roles = await client.query(
        "SELECT id, name, tenant_id, role_type FROM roles ORDER BY tenant_id NULLS FIRST, name"
    );
    console.log(`\n👤 Roles table: ${roles.rowCount} records`);

    const systemRoles = roles.rows.filter(r => r.tenant_id === null);
    const tenantRoles = roles.rows.filter(r => r.tenant_id !== null);
    console.log(`   System roles (tenant_id IS NULL): ${systemRoles.length}`);
    systemRoles.forEach(r => console.log(`     - ${r.name} (${r.role_type}) [${r.id}]`));
    console.log(`   Tenant-specific roles: ${tenantRoles.length}`);

    // Group tenant roles by tenant
    const tenantGroups = {};
    tenantRoles.forEach(r => {
        if (!tenantGroups[r.tenant_id]) tenantGroups[r.tenant_id] = [];
        tenantGroups[r.tenant_id].push(r.name);
    });
    Object.entries(tenantGroups).forEach(([tid, names]) => {
        console.log(`     Tenant ${tid.substring(0, 8)}...: ${names.join(", ")}`);
    });

    // 3. Check role_permissions
    const rp = await client.query("SELECT COUNT(*) as count FROM role_permissions");
    console.log(`\n🔗 Role_permissions table: ${rp.rows[0].count} records`);

    // Check per-role permission counts
    const rpPerRole = await client.query(`
    SELECT r.name, r.tenant_id, COUNT(rp.id) as perm_count
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    GROUP BY r.id, r.name, r.tenant_id
    ORDER BY r.tenant_id NULLS FIRST, r.name
  `);
    console.log("   Permissions per role:");
    rpPerRole.rows.forEach(r => {
        const scope = r.tenant_id ? `tenant:${r.tenant_id.substring(0, 8)}` : "SYSTEM";
        const status = parseInt(r.perm_count) === 0 ? " ❌ EMPTY!" : "";
        console.log(`     ${r.name} (${scope}): ${r.perm_count} permissions${status}`);
    });

    // 4. Check user_roles
    const ur = await client.query("SELECT COUNT(*) as count FROM user_roles");
    console.log(`\n🧑 User_roles table: ${ur.rows[0].count} records`);

    // 5. Check users and their role assignments
    const users = await client.query(`
    SELECT u.id, u.email, u.role, u.tenant_id, u.is_deleted,
           ur.role_id, r.name as rbac_role_name,
           (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = ur.role_id) as perm_count
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.is_deleted = false
    ORDER BY u.tenant_id NULLS FIRST, u.email
  `);

    console.log(`\n👥 Users with RBAC status (${users.rowCount} active users):`);

    const usersWithoutRoles = [];
    const usersWithEmptyPerms = [];

    users.rows.forEach(u => {
        const hasRole = !!u.role_id;
        const permCount = parseInt(u.perm_count || 0);
        let status = "✅";

        if (!hasRole) {
            status = "❌ NO user_roles ENTRY";
            usersWithoutRoles.push(u);
        } else if (permCount === 0) {
            status = "⚠️ Role has 0 permissions";
            usersWithEmptyPerms.push(u);
        }

        const tenant = u.tenant_id ? u.tenant_id.substring(0, 8) + "..." : "PLATFORM";
        console.log(`   ${status} ${u.email} | role: ${u.role} | rbac_role: ${u.rbac_role_name || "NONE"} | perms: ${permCount} | tenant: ${tenant}`);
    });

    // 6. Check tenants
    const tenants = await client.query("SELECT id, name, email FROM tenants ORDER BY created_at");
    console.log(`\n🏢 Tenants: ${tenants.rowCount}`);

    for (const t of tenants.rows) {
        const tenantRoleCount = await client.query(
            "SELECT COUNT(*) as count FROM roles WHERE tenant_id = $1",
            [t.id]
        );
        const hasRoles = parseInt(tenantRoleCount.rows[0].count) > 0;
        console.log(`   ${hasRoles ? "✅" : "❌"} ${t.name} (${t.email}) - ${tenantRoleCount.rows[0].count} roles`);
    }

    // 7. Summary
    console.log("\n" + "═".repeat(60));
    console.log("📊 DIAGNOSIS SUMMARY");
    console.log("═".repeat(60));

    const issues = [];

    if (parseInt(perms.rows[0].count) === 0) {
        issues.push("CRITICAL: permissions table is empty");
    }
    if (systemRoles.length === 0) {
        issues.push("CRITICAL: No system roles found");
    }
    if (parseInt(rp.rows[0].count) === 0) {
        issues.push("CRITICAL: role_permissions table is empty");
    }
    if (usersWithoutRoles.length > 0) {
        issues.push(`${usersWithoutRoles.length} user(s) missing user_roles entries`);
    }
    if (usersWithEmptyPerms.length > 0) {
        issues.push(`${usersWithEmptyPerms.length} user(s) have roles with 0 permissions`);
    }

    // Check for tenants without roles
    for (const t of tenants.rows) {
        const tc = await client.query("SELECT COUNT(*) as count FROM roles WHERE tenant_id = $1", [t.id]);
        if (parseInt(tc.rows[0].count) === 0) {
            issues.push(`Tenant "${t.name}" has no roles cloned`);
        }
    }

    if (issues.length === 0) {
        console.log("✅ No issues found! RBAC data looks healthy.");
    } else {
        console.log(`❌ Found ${issues.length} issue(s):`);
        issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    }

    await client.end();
}

diagnose().catch(err => {
    console.error("❌ Diagnostic failed:", err.message);
    process.exit(1);
});
