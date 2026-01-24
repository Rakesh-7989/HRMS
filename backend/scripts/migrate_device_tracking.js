const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
    const client = new Client({
        connectionString: DATABASE_URL
    });

    try {
        await client.connect();
        const migrationPath = path.join(__dirname, '../src/database/migrations/20260124_add_device_tracking.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);
        console.log('Device tracking migration completed successfully.');
        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        if (client) {
            try { await client.end(); } catch (e) { }
        }
        process.exit(1);
    }
}

runMigration();
