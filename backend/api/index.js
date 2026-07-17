const express = require('express');

let app;

module.exports = async (req, res) => {
  if (!app) {
    console.log('[api/index.js] Cold start: initializing...');
    app = express();
    app.disable('x-powered-by');

    try {
      const runMigrations = require('../src/database/runnall_migration');
      await runMigrations();
      console.log('[api/index.js] Migrations completed.');
    } catch (err) {
      console.error('[api/index.js] Migration error:', err.message);
    }

    const routes = require('../src/routes');
    app.use('/api', routes);
    console.log('[api/index.js] App initialized.');
  }
  app(req, res);
};