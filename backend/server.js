const http = require('http');
const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { initSocket } = require('./src/config/socket');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const HOST = process.env.HOST || '0.0.0.0';
server.listen(env.PORT, HOST, () => {
  logger.info(`HRMS SaaS API listening on ${HOST}:${env.PORT} (HTTP + WebSocket)`);
});

