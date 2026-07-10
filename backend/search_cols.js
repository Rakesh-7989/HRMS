const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://hrms_user:admin@localhost:5432/hrms_saas_db'
});

async function check() {
    const cols = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%days%' OR column_name LIKE '%limit%' OR column_name LIKE '%total%'");
    cols.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}`));

    await pool.end();
}

check();
