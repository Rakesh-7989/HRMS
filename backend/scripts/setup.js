#!/usr/bin/env node


const path = require("path");

// Switch to backend directory (parent of scripts/)
const backendRoot = path.join(__dirname, "..");
if (process.cwd() !== backendRoot) {
  process.chdir(backendRoot);
  console.log(`Switching execution context to: ${backendRoot}`);
}

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function run(cmd, silent = false) {
  try {
    execSync(cmd, { stdio: silent ? "pipe" : "inherit" });
    return true;
  } catch (err) {
    return false;
  }
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(ans); }));
}

// --------------------------------------------------
// 1. Prerequisite Check
// --------------------------------------------------
async function checkPrerequisites() {
  console.log("\n[1/3] Checking prerequisites...\n");

  if (!run("node --version", true)) {
    console.error("Node.js not found. Install from https://nodejs.org/");
    process.exit(1);
  }
  console.log("✓ Node.js OK");

  if (!run("npm --version", true)) {
    console.error("npm not found.");
    process.exit(1);
  }
  console.log("✓ npm OK");

  if (!run("psql --version", true)) {
    console.error("PostgreSQL not found. Install from https://postgresql.org/");
    process.exit(1);
  }
  console.log("✓ PostgreSQL OK\n");
}

// --------------------------------------------------
// 2. Environment Setup
// --------------------------------------------------
async function setupEnvironment() {
  console.log("[2/3] Setting up environment...\n");

  console.log("Installing dependencies...");
  if (!run("npm install")) {
    console.error("Dependency installation failed.");
    process.exit(1);
  }
  console.log("✓ Dependencies installed");

  if (!fs.existsSync(".env")) {
    if (fs.existsSync(".env.example")) {
      fs.copyFileSync(".env.example", ".env");
      console.log("✓ .env created from .env.example");
      console.log("\nEdit .env with your values (DB name, SMTP, JWT, etc.)");
      await ask("Press ENTER when done...");
      require("dotenv").config();
    } else {
      console.error(".env file missing and .env.example not found.");
      process.exit(1);
    }
  } else {
    console.log("✓ .env found");
  }

  if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
    console.log("✓ logs/ created");
  } else {
    console.log("✓ logs/ exists");
  }

  console.log("");
}

// --------------------------------------------------
// 3. Database Initialization
// --------------------------------------------------
async function setupDatabase() {
  console.log("[3/3] Setting up database...\n");

  const {
    DB_HOST = "localhost",
    DB_PORT = 5432,
    DB_USER = "new_hrms_admin",
    DB_NAME = "hrms_new_db",
    DB_PASSWORD,
    POSTGRES_PASSWORD = "root",
  } = process.env;

  const isWindows = process.platform === "win32";
  const SUPERUSER = "postgres";

  // Set superuser password for DB + user creation steps
  process.env.PGPASSWORD = POSTGRES_PASSWORD;

  // -----------------------
  // Step A: Run setup.sql
  // -----------------------
  console.log("Creating DB + user...");
  const setupCmd = isWindows
    ? `psql -U ${SUPERUSER} -d postgres -f src/database/setup.sql`
    : `psql -U ${SUPERUSER} -d postgres -f src/database/setup.sql`;

  if (!run(setupCmd)) {
    console.error("setup.sql failed");
    process.exit(1);
  }
  console.log("✓ Database + user created");

  //Ensure the DB user password matches the one in .env so subsequent steps can connect
  if (DB_PASSWORD) {
    console.log("Setting database user password from .env...");
    const alterCmd = `psql -U ${SUPERUSER} -d postgres -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"`;
    if (!run(alterCmd)) {
      console.error("Failed to set password for DB user");
      process.exit(1);
    }
    console.log("✓ DB user password updated");
  }

  // Now switch to the app user for migrations
  if (DB_PASSWORD) process.env.PGPASSWORD = DB_PASSWORD;

  // -----------------------
  // Step B: Run schema.sql
  // -----------------------
  console.log("Running schema.sql...");
  const schemaCmd =
    `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f src/database/schema.sql`;

  if (!run(schemaCmd)) {
    console.error("schema.sql failed");
    process.exit(1);
  }
  console.log("✓ Schema applied");

  // -----------------------
  // Step C: Run all migrations
  // -----------------------
  console.log("Running migrations...");

  const migrationFiles = [
    // --- Prefixed migrations ---
    "src/database/migrations/001_add_extended_employee_fields.sql",
    "src/database/migrations/001_create_asset_management_tables.sql",
    "src/database/migrations/001_create_expense_categories.sql",

    // --- Dated migrations (chronological) ---
    "src/database/migrations/20251218_add_payroll_tables.sql",
    "src/database/migrations/20260106_leave_tracker.sql",
    "src/database/migrations/20260109_fix_payroll_schema.sql",
    "src/database/migrations/20260109_fix_payroll_schema_tables_only.sql",
    "src/database/migrations/20260109_patch_missing_columns.sql",
    "src/database/migrations/20260109_patch_payroll_items.sql",
    "src/database/migrations/20260113_add_attendance_regularization.sql",
    "src/database/migrations/20260124_geo_fencing.sql",
    "src/database/migrations/20260124_add_device_tracking.sql",
    "src/database/migrations/20260124_corporate_calendar.sql",
    "src/database/migrations/20260126_add_notifications.sql",
    "src/database/migrations/20260127_add_work_mode.sql",
    "src/database/migrations/20260127_enhanced_payroll_structures.sql",
    "src/database/migrations/20260128_add_employee_uan_esi.sql",
    "src/database/migrations/20260128_add_payroll_item_components.sql",
    "src/database/migrations/20260128_make_component_id_nullable.sql",
    "src/database/migrations/20260128_task_comments.sql",
    "src/database/migrations/20260129_add_shifts_table.sql",
    "src/database/migrations/20260129_add_wfh_leave_type.sql",
    "src/database/migrations/20260129_create_wfh_requests.sql",
    "src/database/migrations/20260130_add_dynamic_pricing.sql",
    "src/database/migrations/20260130_add_shift_tracking_to_attendance.sql",
    "src/database/migrations/20260202_add_eod_report_to_attendance.sql",
    "src/database/migrations/20260202_add_is_billable.sql",
    "src/database/migrations/20260202_create_chat_tables.sql",
    "src/database/migrations/20260203_add_project_id_to_timesheet_entries.sql",
    "src/database/migrations/20260203_chat_advanced_schema.sql",
    "src/database/migrations/20260203_chat_enhancements.sql",
    "src/database/migrations/20260203_email_verifications.sql",
    "src/database/migrations/20260203_make_email_globally_unique.sql",
    "src/database/migrations/20260205_chat_pin_edit.sql",
    "src/database/migrations/20260206_robust_subscriptions.sql",
    "src/database/migrations/20260209_add_profile_photo_to_employees.sql",
    "src/database/migrations/20260210_add_coupon_code_to_subscriptions.sql",
    "src/database/migrations/20260210_billing_system_final.sql",
    "src/database/migrations/20260211_add_seed_functions.sql",
    "src/database/migrations/20260211_add_two_factor_auth.sql",
    "src/database/migrations/20260211_payroll_fixes.sql",
    "src/database/migrations/20260212_add_tax_config_tables.sql",
    "src/database/migrations/river_framework.sql",
    "src/database/migrations/20260212_payroll_power_upgrade.sql",
    "src/database/migrations/20260213_enhance_attendance_multi_tenant.sql",
    "src/database/migrations/20260215_rbac_comprehensive.sql",
    "src/database/migrations/20260218_system_refinements_consolidated.sql",
    "src/database/migrations/20260219_executive_permissions.sql",
    "src/database/migrations/20260219_scoped_employee_id.sql",
    "src/database/migrations/20260220_global_rbac_alignment.sql",
    "src/database/migrations/20260225_add_role_default_path.sql",
  ];

  for (const migrationFile of migrationFiles) {
    if (fs.existsSync(migrationFile)) {
      console.log(`Running ${migrationFile}...`);
      const migrationCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${migrationFile}`;
      if (!run(migrationCmd)) {
        console.error(`Migration ${migrationFile} failed`);
        process.exit(1);
      }
      console.log(`✓ ${migrationFile} completed`);
    } else {
      console.log(`Migration file ${migrationFile} not found, skipping...`);
    }
  }

  console.log("✓ All migrations applied");

  // -----------------------
  // Step C: Seed Calendar Data
  // -----------------------
  console.log("Seeding calendar data...");
  const seedCalendarPath = "scripts/seed_calendar_2026.js";

  if (fs.existsSync(seedCalendarPath)) {
    const calendarCmd = `node ${seedCalendarPath}`;

    if (!run(calendarCmd)) {
      console.error("Seeding calendar failed");
      process.exit(1);
    }
    console.log("✓ Calendar data seeded");
  } else {
    console.log("No calendar seed script found");
  }

  // -----------------------
  // Step C.1: Seed State Holidays
  // -----------------------
  console.log("Seeding state holidays...");
  const seedStateHolidaysPath = "scripts/seed_state_holidays.js";

  if (fs.existsSync(seedStateHolidaysPath)) {
    const stateHolidaysCmd = `node ${seedStateHolidaysPath}`;

    if (!run(stateHolidaysCmd)) {
      console.error("Seeding state holidays failed");
      process.exit(1);
    }
    console.log("✓ State holidays seeded");
  } else {
    console.log("No state holidays seed script found");
  }

  // -----------------------
  // Step D.1: Seed Statutory Config
  // -----------------------
  console.log("Seeding statutory config...");
  const seedStatutoryPath = "scripts/seed_statutory_config.js";

  if (fs.existsSync(seedStatutoryPath)) {
    const statutoryCmd = `node ${seedStatutoryPath}`;

    if (!run(statutoryCmd)) {
      console.error("Seeding statutory config failed");
      process.exit(1);
    }
    console.log("✓ Statutory config seeded");
  } else {
    console.log("No statutory config seed script found");
  }

  // -----------------------
  // Step F: Seed Plans
  // -----------------------
  console.log("Seeding subscription plans...");
  const seedPlansPath = "src/database/seed/seed_plans.sql";

  if (fs.existsSync(seedPlansPath)) {
    const seedCmd =
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${seedPlansPath}`;

    if (!run(seedCmd)) {
      console.error(" Seeding plans failed");
      process.exit(1);
    }
    console.log("✓ Plans seeded");
  } else {
    console.log("No plans seed file found");
  }

  // -----------------------
  // Step F.1: Seed Salary Components
  // -----------------------
  console.log("Seeding salary components...");
  const seedSalaryComponentsPath = "src/database/seed/seed_salary_components.sql";

  if (fs.existsSync(seedSalaryComponentsPath)) {
    const seedCmd =
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${seedSalaryComponentsPath}`;

    if (!run(seedCmd)) {
      console.error(" Seeding salary components failed");
      process.exit(1);
    }
    console.log("✓ Salary components seeded");
  } else {
    console.log("No salary components seed file found");
  }

  // -----------------------
  // Step F.2: Seed Salary Structure
  // -----------------------
  console.log("Seeding salary structure...");
  const seedSalaryStructurePath = "scripts/seed_salary_structure.js";

  if (fs.existsSync(seedSalaryStructurePath)) {
    const salaryStructureCmd = `node ${seedSalaryStructurePath}`;

    if (!run(salaryStructureCmd)) {
      console.error("Seeding salary structure failed");
      process.exit(1);
    }
    console.log("✓ Salary structure seeded");
  } else {
    console.log("No salary structure seed script found");
  }

  // -----------------------
  // Step G: Seed Super Admin
  // -----------------------
  console.log("Seeding super admin user...");
  const seedUserPath = "src/database/seed/seed_users.sql";

  if (fs.existsSync(seedUserPath)) {
    const seedCmd =
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${seedUserPath}`;

    if (!run(seedCmd)) {
      console.error(" Seeding users failed");
      process.exit(1);
    }
    console.log("✓ Super Admin seeded");
  } else {
    console.log("No user seed file found");
  }

  // -----------------------
  // Step H: Seed Demo Data (optional)
  // -----------------------
  console.log("Seeding demo data...");
  const seedDemoDataPath = "scripts/run-demo-seed.js";

  if (fs.existsSync(seedDemoDataPath)) {
    const demoCmd = `node ${seedDemoDataPath}`;

    if (!run(demoCmd)) {
      console.error("Seeding demo data failed");
      process.exit(1);
    }
    console.log("✓ Demo data seeded");
  } else {
    console.log("No demo data seed script found");
  }

  console.log("");
}


async function main() {
  try {
    await checkPrerequisites();
    await setupEnvironment();
    await setupDatabase();

    console.log("\n Setup complete!");
    console.log("Next:");
    console.log("  ➜ Start server: npm run dev");

    const start = await ask("Start the server now? (y/n): ");

    if (start.toLowerCase() === "y") {
      console.log("\n Launching server...\n");
      run("npm run dev");
    } else {
      console.log("\nRun `npm run dev` when ready.");
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();