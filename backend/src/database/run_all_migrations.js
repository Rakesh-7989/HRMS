const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Load environment variables from .env file
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Validate required environment variables
const hasIndividualVars = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME;
const hasDatabaseUrl = !!process.env.DATABASE_URL;
if (!hasIndividualVars && !hasDatabaseUrl) {
    console.error("❌ Missing database configuration.");
    console.error("   Set either DATABASE_URL or (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) in your .env file.");
    process.exit(1);
}

// Support both connection string and individual vars
const dbConfig = hasDatabaseUrl && !hasIndividualVars
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || "5432", 10),
    };

// Postgres "already exists" errors
const ALREADY_EXISTS_ERRORS = new Set([
    "42P07", // relation already exists
    "42710",  // duplicate object
    "42701"  // duplicate column
]);

async function runMigrations() {
    const client = new Client(dbConfig);
    await client.connect();

    const executedFiles = [];
    const skippedFiles = [];

    try {
        console.log("📦 Connected to PostgreSQL");

        // Ensure migration table
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Already executed
        const res = await client.query(
            "SELECT filename FROM schema_migrations"
        );
        const executed = new Set(res.rows.map(r => r.filename));

        // Read files
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith(".sql"))
            .sort();

        console.log(`🔍 Found ${files.length} migration files`);

        for (const file of files) {
            if (executed.has(file)) {
                console.log(`⏭️  Skipping (already recorded): ${file}`);
                skippedFiles.push(file);
                continue;
            }

            console.log(`🚀 Running: ${file}`);
            const sql = fs.readFileSync(
                path.join(MIGRATIONS_DIR, file),
                "utf8"
            );

            try {
                await client.query("BEGIN");
                await client.query(sql);
                await client.query("COMMIT");

                // record success
                await client.query(
                    "INSERT INTO schema_migrations (filename) VALUES ($1)",
                    [file]
                );

                executedFiles.push(file);
                console.log(`✅ Done: ${file}`);
            } catch (err) {
                // ALWAYS rollback first
                await client.query("ROLLBACK");

                if (ALREADY_EXISTS_ERRORS.has(err.code)) {
                    console.warn(`⚠️  Skipped (already exists): ${file}`);

                    // record skip OUTSIDE transaction
                    await client.query(
                        "INSERT INTO schema_migrations (filename) VALUES ($1)",
                        [file]
                    );

                    skippedFiles.push(file);
                    continue;
                }

                console.error(`❌ Failed: ${file}`);
                throw err;
            }
        }

        // ===== SUMMARY =====
        console.log("\n📊 Migration Summary");
        console.log("────────────────────────");
        console.log(`Total files   : ${files.length}`);
        console.log(`Executed      : ${executedFiles.length}`);
        console.log(`Skipped       : ${skippedFiles.length}`);

        if (skippedFiles.length) {
            console.log("\n⏭️  Skipped files:");
            skippedFiles.forEach(f => console.log(`  - ${f}`));
        }

        console.log("\n🎉 Migration process completed safely");
    } catch (err) {
        console.error("\n💥 Migration process stopped due to error");
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();

