const db = require('../src/config/db');

async function debug() {
    try {
        console.log('Connecting...');
        const res = await db.query('SELECT current_user, session_user, current_database()');
        console.log('User info:', res.rows[0]);
        
        console.log('Attempting to create a test table...');
        await db.query('CREATE TABLE IF NOT EXISTS debug_test_table (id serial primary key)');
        console.log('Test table created successfully.');
        
        await db.query('DROP TABLE debug_test_table');
        console.log('Test table dropped.');
        
        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debug();
