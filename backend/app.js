const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const dbSessionContext = require('./src/middleware/dbSessionContext');
const logger = require('./src/config/logger');
const { swaggerUi, swaggerSpec } = require('./src/config/swagger');
const requestLogger = require('./src/middleware/requestLogger');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();

// Security + parsers
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log each request
app.use(requestLogger);

// Apply Rate Limiting
app.use(generalLimiter);

// Initialize DB session context for RLS
app.use(dbSessionContext);

// Root
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'HRMS SaaS API running' });
});

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// YOUR ENTIRE API
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
