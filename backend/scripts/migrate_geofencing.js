const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load env from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
    const client = new Client({
        connectionString: DATABASE_URL
    });

    try {
        console.log('Connecting to DB...');
        await client.connect();

        console.log('Reading migration file...');
        const migrationPath = path.join(__dirname, '../src/database/migrations/20260124_geo_fencing.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');
        await client.query(sql);

        console.log('Migration completed successfully.');
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
