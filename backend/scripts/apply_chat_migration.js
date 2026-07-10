const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    const client = await pool.connect();

    try {
        console.log("Starting Chat Migrations...\n");

        // Migration 1: Create base chat tables
        console.log("1. Creating base chat tables...");
        const migration1 = fs.readFileSync(
            path.join(__dirname, '../src/database/migrations/20260202_create_chat_tables.sql'),
            'utf8'
        );
        await client.query(migration1);
        console.log("   ✓ Base tables created\n");

        // Migration 2: Advanced schema (threading, reactions, status)
        console.log("2. Applying advanced schema...");
        const migration2 = fs.readFileSync(
            path.join(__dirname, '../src/database/migrations/20260203_chat_advanced_schema.sql'),
            'utf8'
        );
        await client.query(migration2);
        console.log("   ✓ Advanced schema applied\n");

        // Migration 3: Chat enhancements (call logs, unread counts)
        console.log("3. Applying chat enhancements...");
        const migration3 = fs.readFileSync(
            path.join(__dirname, '../src/database/migrations/20260203_chat_enhancements.sql'),
            'utf8'
        );
        await client.query(migration3);
        console.log("   ✓ Enhancements applied\n");

        // Migration 4: Add flags for editing and pinning
        console.log("4. Adding is_edited and is_pinned columns...");
        await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;");
        await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;");
        console.log("   ✓ columns added\n");

        console.log("=================================");
        console.log("All chat migrations applied successfully!");
        console.log("=================================\n");

    } catch (err) {
        console.error("Migration failed:", err.message);
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

run();
