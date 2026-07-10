const app = require('../app');
const env = require('../src/config/env');
const logger = require('../src/config/logger');

if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  (async () => {
    try {
      logger.info('Running pending database migrations...');
      await require('../src/database/runnall_migration')();
      logger.info('Migrations completed.');
    } catch (err) {
      logger.error('Migration error:', err.message);
    }
  })();
}

module.exports = app;
