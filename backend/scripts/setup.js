#!/usr/bin/env node

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
    DB_USER = "hrms_user",
    DB_NAME = "hrms_saas_db",
    DB_PASSWORD,
  } = process.env;

  if (DB_PASSWORD) process.env.PGPASSWORD = DB_PASSWORD;

  const isWindows = process.platform === "win32";
  const SUPERUSER = "postgres";

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

  // Ensure the DB user password matches the one in .env so subsequent steps can connect
  if (DB_PASSWORD) {
    console.log("Setting database user password from .env...");
    const alterCmd = `psql -U ${SUPERUSER} -d postgres -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"`;
    if (!run(alterCmd)) {
      console.error("Failed to set password for DB user");
      process.exit(1);
    }
    console.log("✓ DB user password updated");
  }

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
  // Step C: Seed initial roles
  // -----------------------
  console.log("Seeding roles...");
  const seedRolesPath = "src/database/seed/seed_initial_roles.sql";

  if (fs.existsSync(seedRolesPath)) {
    const seedCmd =
      `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${seedRolesPath}`;

    if (!run(seedCmd)) {
      console.error(" Seeding roles failed");
      process.exit(1);
    }
    console.log("✓ Roles seeded");
  } else {
    console.log("No roles seed file found");
  }

  // -----------------------
  // Step C.1: Seed Plans
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
  // Step D: Seed Super Admin
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