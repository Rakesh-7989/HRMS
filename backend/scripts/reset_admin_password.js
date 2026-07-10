const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
    user: 'hrms_user',
    host: 'localhost',
    database: 'hrms_saas_db',
    password: 'root',
    port: 5432,
});

async function resetPassword() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const email = 'contact@seedtenant.com';
        const newPassword = 'Admin@123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const res = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );

        if (res.rowCount > 0) {
            console.log(`Password updated for ${email}.`);
        } else {
            console.error(`User ${email} not found.`);
        }
    } catch (err) {
        console.error('Error updating password:', err);
    } finally {
        await client.end();
    }
}

resetPassword();
