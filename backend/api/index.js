process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  setTimeout(() => process.exit(1), 1000);
});

const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'HRMS SaaS API running (minimal)' });
});

app.all('*', (req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

module.exports = app;
