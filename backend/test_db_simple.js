const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function test() {
    const dbUrl = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const isRemote = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

    console.log('Testing connection to:', dbUrl);
    console.log('SSL Enabled:', isProduction || isRemote);

    const client = new Client({
        connectionString: dbUrl,
        ssl: (isProduction || isRemote) ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('Successfully connected!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
    } catch (err) {
        console.error('Connection test failed:', err);
    } finally {
        await client.end();
    }
}

test();
