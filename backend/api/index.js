process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  setTimeout(() => process.exit(1), 1000);
});

let app;
try {
  app = require('../app');
} catch (err) {
  console.error('APP ERROR:', err.message);
  console.error(err.stack);
  app = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  };
}

module.exports = app;
