/**
 * Sentry Configuration for Backend
 * Initializes Sentry error tracking and performance monitoring
 */

const Sentry = require('@sentry/node');
const { profilingIntegration } = require('@sentry/profiling-node');

require('dotenv').config();

const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_DSN = process.env.SENTRY_DSN;
const RELEASE = process.env.npm_package_version || '1.0.0';

const initializeSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured. Sentry disabled.');
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      profilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.pgIntegration(),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out known non-critical errors
      const error = hint.originalException;
      
      // Skip validation errors (400 level)
      if (error?.statusCode === 400 || error?.status === 400) {
        return null;
      }
      
      // Skip known benign errors
      const benignMessages = [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'socket hang up',
        'Request timeout',
        'Client closed connection',
      ];
      
      if (error?.message && benignMessages.some(msg => error.message.includes(msg))) {
        return null;
      }
      
      // Add custom tags
      if (event.tags) {
        event.tags = {
          ...event.tags,
          service: 'hrms-backend',
          environment: ENVIRONMENT,
        };
      }
      
      return event;
    },
    
    // Context
    initialScope: {
      tags: {
        service: 'hrms-backend',
        environment: ENVIRONMENT,
      },
    },
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Debug mode
    debug: process.env.NODE_ENV !== 'production',
  });

  console.log(`✅ Sentry initialized for ${ENVIRONMENT} environment`);
  return Sentry;
};

// Express error handler middleware
const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all 5xx errors
    if (error.statusCode >= 500) return true;
    // Capture unhandled errors
    if (!error.statusCode) return true;
    return false;
  },
});

const sentryRequestHandler = Sentry.Handlers.requestHandler();

module.exports = {
  Sentry,
  initializeSentry,
  sentryErrorHandler,
  sentryRequestHandler,
};