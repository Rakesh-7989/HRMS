const pool = require("../src/config/db");

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Adding eod_report column to attendance table...");

        await client.query(`
            ALTER TABLE attendance 
            ADD COLUMN IF NOT EXISTS eod_report TEXT;
        `);

        console.log("✓ Migration successful");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
