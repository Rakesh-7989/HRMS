const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const MIGRATIONS_DIR = path.join(__dirname, '../backend/src/database/migrations');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  });

  try {
    await client.connect();
    console.log('Connected to database for migrations.');

    // 1. Create history table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_history (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Get executed migrations
    const { rows } = await client.query('SELECT filename FROM migrations_history');
    const executedFiles = new Set(rows.map(r => r.filename));

    // 3. Read files from directory
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sorting is important for order

    console.log(`Found ${files.length} SQL files in migrations folder.`);

    const markDoneOnly = process.argv.includes('--mark-done');
    if (markDoneOnly) {
      console.log('MARK-DONE MODE: Recording filenames without executing SQL.');
    }

    for (const file of files) {
      if (!executedFiles.has(file)) {
        if (markDoneOnly) {
           await client.query('INSERT INTO migrations_history (filename) VALUES ($1)', [file]);
           console.log(`Marked as done: ${file}`);
           continue;
        }

        console.log(`Executing migration: ${file}...`);
        const filePath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations_history (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Successfully applied: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`FAILED to apply ${file}. Stopping migrations.`);
          console.error(error.message);
          process.exit(1);
        }
      }
    }

    console.log('All migrations are up to date.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
