try {
  require('../src/config/env');
} catch (err) {
  console.error('ENV ERROR:', err.message);
}

let app;
try {
  console.log('Loading app...');
  app = require('../app');
  console.log('App loaded.');
} catch (err) {
  console.error('APP ERROR:', err.message);
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
      console.error('Migration error:', err.message);
    }
  })();
}

module.exports = app;
