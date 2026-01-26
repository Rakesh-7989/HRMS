const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function syncAnnouncementsToNotifications() {
    const client = await pool.connect();
    try {
        console.log('Syncing existing announcements to notifications...');

        // Fetch all announcements
        const announcementsRes = await client.query('SELECT * FROM corporate_announcements');
        console.log(`Found ${announcementsRes.rowCount} announcements.`);

        for (const ann of announcementsRes.rows) {
            // Get all active users in that tenant
            const usersRes = await client.query(
                'SELECT id FROM users WHERE tenant_id = $1 AND is_active = true AND is_deleted = false',
                [ann.tenant_id]
            );

            console.log(`Processing announcement "${ann.title}" for ${usersRes.rowCount} users in tenant ${ann.tenant_id}`);

            for (const user of usersRes.rows) {
                // Check if notification already exists to avoid duplicates
                const exists = await client.query(
                    'SELECT id FROM notifications WHERE user_id = $1 AND title = $2 AND created_at >= $3',
                    [user.id, ann.title, ann.created_at]
                );

                if (exists.rowCount === 0) {
                    await client.query(
                        `INSERT INTO notifications (tenant_id, user_id, title, message, type, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [ann.tenant_id, user.id, ann.title, ann.message, 'info', ann.created_at]
                    );
                }
            }
        }

        console.log('Sync completed successfully.');
    } catch (err) {
        console.error('Sync failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

syncAnnouncementsToNotifications();
