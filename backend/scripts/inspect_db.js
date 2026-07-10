require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function inspect() {
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
      ORDER BY column_name;
    `);

        console.log("Columns in 'employees' table:");
        res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

inspect();
