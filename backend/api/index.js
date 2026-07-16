try {
  require('../src/config/env');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('ENV ERROR:', err.message);
}

let app;
try {
  // eslint-disable-next-line no-console
  console.log('Loading app...');
  app = require('../app');
  // eslint-disable-next-line no-console
  console.log('App loaded.');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('APP ERROR:', err.message);
  // eslint-disable-next-line no-console
  console.error(err.stack);
  app = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  };
}

if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  (async () => {
    try {
      await require('../src/database/runnall_migration')();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Migration error:', err.message);
    }
  })();
}

module.exports = app;
