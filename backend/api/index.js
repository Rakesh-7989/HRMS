let app;
try {
  console.log('Loading app module...');
  app = require('../app');
  console.log('App module loaded successfully');
} catch (err) {
  console.error('Failed to load app:', err.message);
  console.error(err.stack);
  throw err;
}

if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  console.log('RUN_MIGRATIONS_ON_START is true, running migrations...');
  (async () => {
    try {
      console.log('Running pending database migrations...');
      await require('../src/database/runnall_migration')();
      console.log('Migrations completed.');
    } catch (err) {
      console.error('Migration error:', err.message);
    }
  })();
} else {
  console.log('RUN_MIGRATIONS_ON_START is not set, skipping migrations');
}

console.log('Exporting app...');
module.exports = app;
