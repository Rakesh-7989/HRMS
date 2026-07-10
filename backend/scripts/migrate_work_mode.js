const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

//const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hrms_user:admin@localhost:5432/hrms_saas_db';

async function runMigration() {
    console.log('🔌 Connecting to database...');
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        const migrationFile = '20260127_add_work_mode.sql';
        const migrationPath = path.join(__dirname, `../src/database/migrations/${migrationFile}`);

        console.log(`📄 Reading migration file: ${migrationFile}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Executing migration...');
        await client.query(sql);

        console.log('✅ Work Mode migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
