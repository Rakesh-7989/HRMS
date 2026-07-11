const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const dbSessionContext = require('./src/middleware/dbSessionContext');
const logger = require('./src/config/logger');
const env = require('./src/config/env');
const { swaggerUi, swaggerSpec } = require('./src/config/swagger');
const requestLogger = require('./src/middleware/requestLogger');
const { generalLimiter } = require('./src/middleware/rateLimiter');


const app = express();
app.set('trust proxy', 1); 
// Security + parsers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

const corsWhitelist = [env.FRONTEND_URL].filter(Boolean);
if (env.NODE_ENV === 'development') {
  corsWhitelist.push('http://localhost:5173', 'http://localhost:3000');
}
app.use(cors({
  origin: corsWhitelist,
  credentials: true,
}));

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Protected static file serving for uploads
app.use('/uploads', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }
  try {
    jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET);
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    if (['.html', '.htm', '.svg', '.js', '.xml'].includes(ext)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// Log each request
app.use(requestLogger);

// Initialize DB session context for RLS
app.use(dbSessionContext);

// Root
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'HRMS SaaS API running' });
});

// Swagger (disabled in production)
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// YOUR ENTIRE API
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
