const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const dbSessionContext = require('./src/middleware/dbSessionContext');
const env = require('./src/config/env');
const { swaggerUi, swaggerSpec } = require('./src/config/swagger');
const requestLogger = require('./src/middleware/requestLogger');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const httpsRedirect = require('./src/middleware/httpsRedirect');
const originCheck = require('./src/middleware/originCheck');
const Sentry = require('@sentry/node');
const {
    sanitizeInput,
    apiSecurityHeaders,
    validateRequestSize,
} = require('./src/middleware/security');


const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 0.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security + parsers
app.use(httpsRedirect);
app.use(originCheck);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", ...(env.NODE_ENV === 'development' ? ['ws://localhost:*'] : [])],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  originAgentCluster: true,
  dnsPrefetchControl: { allow: false },
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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security middleware
app.use(sanitizeInput);
app.use(apiSecurityHeaders);
app.use(validateRequestSize);

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

// Sentry error handler (must be first error handler)
if (env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());

// Global error handler
app.use(errorHandler);

module.exports = app;
