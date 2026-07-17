const start = Date.now();
console.error(`[api/index.js] Starting at ${start}`);

try {
  console.error('[api/index.js] Loading express...');
  const express = require('express');
  console.error(`[api/index.js] express loaded in ${Date.now() - start}ms`);

  console.error('[api/index.js] Creating app...');
  const app = express();
  app.disable('x-powered-by');

  console.error('[api/index.js] Loading routes...');
  const routes = require('../src/routes');
  console.error(`[api/index.js] Routes loaded in ${Date.now() - start}ms`);

  app.use('/api', routes);
  console.error(`[api/index.js] App ready in ${Date.now() - start}ms`);

  module.exports = app;
} catch (err) {
  console.error(`[api/index.js] ERROR at ${Date.now() - start}ms:`, err.message);
  console.error(err.stack);

  module.exports = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: err.message,
      stack: err.stack,
      loadTimeMs: Date.now() - start
    }));
  };
}
