const express = require('express');
const app = express();
app.disable('x-powered-by');

const routes = require('../src/routes');
const runMigrations = require('../src/database/runnall_migration');

app.use('/api', routes);

if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  (async () => {
    try {
      console.log('[api/index.js] Running pending database migrations...');
      await runMigrations();
      console.log('[api/index.js] Migrations completed.');
    } catch (err) {
      console.error('[api/index.js] Migration error:', err.message);
    }
  })();
}

module.exports = app;
