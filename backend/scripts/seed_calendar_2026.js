const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const holidays2026 = {
    '2026-01-26': 'Republic Day',
    '2026-03-20': 'Eid-ul-Fitr',
    '2026-04-03': 'Good Friday',
    '2026-05-01': 'Buddha Purnima',
    '2026-05-27': 'Id-ul-Zuha (Bakrid)',
    '2026-06-26': 'Muharram',
    '2026-08-15': 'Independence Day',
    '2026-08-26': 'Prophet Mohammad Birthday',
    '2026-10-02': 'Mahatma Gandhi Birthday',
    '2026-10-20': 'Dussehra',
    '2026-11-08': 'Diwali',
    '2026-11-24': 'Guru Nanak Birthday',
    '2026-12-25': 'Christmas Day'
};

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function generateAndSeed() {
    const csvRows = [['Date', 'Day', 'Is_Weekend', 'Holiday_Name', 'Holiday_Type']];
    const dbData = [];

    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-12-31');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

        let holidayName = '';
        let holidayType = '';

        if (holidays2026[dateStr]) {
            holidayName = holidays2026[dateStr];
            holidayType = 'Central';
        } else if (isWeekend) {
            holidayName = 'Weekend';
            holidayType = 'Weekend';
        }

        csvRows.push([
            dateStr,
            dayName,
            isWeekend ? 'Yes' : 'No',
            holidayName,
            holidayType
        ]);

        dbData.push({
            date: dateStr,
            day: dayName,
            is_weekend: isWeekend ? 'Yes' : 'No',
            holiday_name: holidayName || null,
            holiday_type: holidayType || null
        });
    }

    // Save CSV
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const assetsDir = path.join(__dirname, '../Assests');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
    fs.writeFileSync(path.join(assetsDir, 'base_calendar_2026.csv'), csvContent);
    console.log('CSV generated at Assests/base_calendar_2026.csv');

    // Seed DB
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM base_calendar');
        for (const row of dbData) {
            await client.query(
                'INSERT INTO base_calendar (date, day, is_weekend, holiday_name, holiday_type) VALUES ($1, $2, $3, $4, $5)',
                [row.date, row.day, row.is_weekend, row.holiday_name, row.holiday_type]
            );
        }
        await client.query('COMMIT');
        console.log('Database seeded with 2026 base calendar.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

generateAndSeed();
