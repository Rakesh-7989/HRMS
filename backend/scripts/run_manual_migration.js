const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../src/config/env');

async function runMigration() {
    const client = new Client({
        connectionString: env.DATABASE_URL
    });

    try {
        console.log('Connecting to DB...');
        await client.connect();

        console.log('Reading migration file: 20260225_multi_stage_approval.sql');
        const migrationPath = path.join(__dirname, '../src/database/migrations/20260225_multi_stage_approval.sql');
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
