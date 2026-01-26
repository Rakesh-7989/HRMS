const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function syncTasksToNotifications() {
    const client = await pool.connect();
    try {
        console.log('Syncing existing tasks to notifications...');

        // Fetch all pending tasks
        const tasksRes = await client.query(`
            SELECT t.*, e.user_id 
            FROM inbox_tasks t
            JOIN employees e ON t.employee_id = e.id
            WHERE t.status IN ('PENDING', 'Not started', 'In progress')
        `);
        console.log(`Found ${tasksRes.rowCount} pending tasks.`);

        for (const task of tasksRes.rows) {
            // Check if notification already exists
            const exists = await client.query(
                'SELECT id FROM notifications WHERE user_id = $1 AND title LIKE $2 AND created_at >= $3',
                [task.user_id, `%${task.title}%`, task.created_at]
            );

            if (exists.rowCount === 0) {
                await client.query(
                    `INSERT INTO notifications (tenant_id, user_id, title, message, type, link, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        task.tenant_id,
                        task.user_id,
                        `New Task: ${task.title}`,
                        `You have a pending task in the ${task.category} category.`,
                        'info',
                        '/inbox',
                        task.created_at
                    ]
                );
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

syncTasksToNotifications();
