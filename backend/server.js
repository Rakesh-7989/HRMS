const http = require('http');
const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { initSocket } = require('./src/config/socket');

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(env.PORT, () => {
  logger.info(`HRMS SaaS API listening on port ${env.PORT} (HTTP + WebSocket)`);
});

