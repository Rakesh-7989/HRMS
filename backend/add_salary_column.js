const db = require("./src/config/db");

async function addSalaryColumn() {
    try {
        await db.query(
            "ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(15, 2) DEFAULT 0"
        );
        // eslint-disable-next-line no-console
        console.log("Column annual_salary added successfully");
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to add column", err.message);
    } finally {
        process.exit();
    }
}

addSalaryColumn();
