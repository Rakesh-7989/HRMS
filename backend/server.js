const http = require('http');
const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { initSocket } = require('./src/config/socket');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Auto-run pending DB migrations on startup (production only)
if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  (async () => {
    try {
      logger.info('Running pending database migrations...');
      await require('./src/database/runnall_migration')();
      logger.info('Migrations completed.');
    } catch (err) {
      logger.error('Migration error:', err.message);
    }
  })();
}

const HOST = process.env.HOST || '0.0.0.0';
server.listen(env.PORT, HOST, () => {
  logger.info(`HRMS SaaS API listening on ${HOST}:${env.PORT} (HTTP + WebSocket)`);
});

