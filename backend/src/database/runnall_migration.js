const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "hrms_saas_db",
        port: process.env.DB_PORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
        // eslint-disable-next-line no-console
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
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        // eslint-disable-next-line no-console
        console.log(`🔍 Found ${files.length} migration files`);

        for (const file of files) {
            if (executed.has(file)) {
                // eslint-disable-next-line no-console
                console.log(`⏭️  Skipping (already recorded): ${file}`);
                skippedFiles.push(file);
                continue;
            }

            // eslint-disable-next-line no-console
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
                // eslint-disable-next-line no-console
                console.log(`✅ Done: ${file}`);
            } catch (err) {
                // ALWAYS rollback first
                await client.query("ROLLBACK");

                if (ALREADY_EXISTS_ERRORS.has(err.code)) {
                    // eslint-disable-next-line no-console
                    console.warn(`⚠️  Skipped (already exists): ${file}`);

                    // record skip OUTSIDE transaction
                    await client.query(
                        "INSERT INTO schema_migrations (filename) VALUES ($1)",
                        [file]
                    );

                    skippedFiles.push(file);
                    continue;
                }

                // eslint-disable-next-line no-console
                console.error(`❌ Failed: ${file}`);
                throw err;
            }
        }

        // ===== SUMMARY =====
        // eslint-disable-next-line no-console
        console.log("\n📊 Migration Summary");
        // eslint-disable-next-line no-console
        console.log("────────────────────────");
        // eslint-disable-next-line no-console
        console.log(`Total files   : ${files.length}`);
        // eslint-disable-next-line no-console
        console.log(`Executed      : ${executedFiles.length}`);
        // eslint-disable-next-line no-console
        console.log(`Skipped       : ${skippedFiles.length}`);

        if (skippedFiles.length) {
            // eslint-disable-next-line no-console
            console.log("\n⏭️  Skipped files:");
            skippedFiles.forEach(f => {
                // eslint-disable-next-line no-console
                console.log(`  - ${f}`);
            });
        }

        // eslint-disable-next-line no-console
        console.log("\n🎉 Migration process completed safely");
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("\n💥 Migration process stopped due to error");
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;

