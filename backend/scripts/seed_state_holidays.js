const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const stateHolidays = [
    { state: 'Karnataka', date: '2026-11-01', holiday_name: 'Kannada Rajyotsava' },
    { state: 'Karnataka', date: '2026-01-14', holiday_name: 'Makar Sankranti' },
    { state: 'Maharashtra', date: '2026-05-01', holiday_name: 'Maharashtra Day' },
    { state: 'Tamil Nadu', date: '2026-01-14', holiday_name: 'Pongal' },
    { state: 'Tamil Nadu', date: '2026-01-15', holiday_name: 'Thiruvalluvar Day' },
    { state: 'Andhra Pradesh', date: '2026-01-14', holiday_name: 'Bhogi' },
    { state: 'Andhra Pradesh', date: '2026-01-15', holiday_name: 'Sankranti' },
    { state: 'Andhra Pradesh', date: '2026-03-19', holiday_name: 'Ugadi' },
    { state: 'Telangana', date: '2026-01-14', holiday_name: 'Bhogi' },
    { state: 'Telangana', date: '2026-03-19', holiday_name: 'Ugadi' },
    { state: 'Telangana', date: '2026-06-02', holiday_name: 'Telangana Formation Day' }
];

async function seedStateHolidays() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const h of stateHolidays) {
            await client.query(
                `INSERT INTO state_holidays (state, date, holiday_name) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (state, date) DO UPDATE SET holiday_name = $3`,
                [h.state, h.date, h.holiday_name]
            );
        }
        await client.query('COMMIT');
        console.log('State holidays seeded.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedStateHolidays();
