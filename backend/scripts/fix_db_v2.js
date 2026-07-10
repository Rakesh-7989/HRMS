require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const MIGRATIONS = [
    "src/database/migrations/20260129_create_wfh_requests.sql",
    "src/database/migrations/20260129_add_wfh_leave_type.sql"
];

async function runFix() {
    try {
        console.log("Connecting to database...");
        await client.connect();
        console.log("Connected.");

        for (const file of MIGRATIONS) {
            const filePath = path.join(__dirname, "..", file);
            if (fs.existsSync(filePath)) {
                console.log(`Applying ${file}...`);
                const sql = fs.readFileSync(filePath, "utf8");
                try {
                    await client.query(sql);
                    console.log(`✓ Applied ${file}`);
                } catch (e) {
                    console.log(`! Error applying ${file}: ${e.message}`);
                }
            } else {
                console.error(`File not found: ${filePath}`);
            }
        }

        console.log("\nWFH Fix Complete. Please restart your backend server.");
        process.exit(0);
    } catch (err) {
        console.error("Fatal error:", err);
        process.exit(1);
    }
}

runFix();
