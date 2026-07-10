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
    "src/database/migrations/20260128_add_employee_uan_esi.sql",
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

        console.log("\nUAN Fix Complete. Please restart your backend server.");
        process.exit(0);
    } catch (err) {
        console.error("Fatal error:", err);
        process.exit(1);
    }
}

runFix();
