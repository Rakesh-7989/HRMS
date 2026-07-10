/**
 * Script to clear all attendance data for testing
 * Run with: node scripts/clear_attendance.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://hrms_user:root@localhost:5432/hrms_saas_db'
});

async function clearAttendance() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Clearing all attendance data...');

        // Delete all attendance records
        const result = await client.query('DELETE FROM attendance');

        console.log(`✅ Successfully deleted ${result.rowCount} attendance records`);
        console.log('');
        console.log('You can now test clock in/clock out functionality fresh!');

    } catch (error) {
        console.error('❌ Error clearing attendance:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

clearAttendance();
