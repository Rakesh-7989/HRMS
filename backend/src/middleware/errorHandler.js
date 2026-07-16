
const { AppError } = require('../utils/customErrors');
const logger = require('../config/logger');

module.exports = function errorHandler(err, req, res, _next) {
    logger.error({ err }, 'Request error');

    // Also log to console for better visibility in development
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('\n ERROR in', req.method, req.path);
        // eslint-disable-next-line no-console
        console.error('Message:', err.message);
        // eslint-disable-next-line no-console
        console.error('Stack:', err.stack);
        // eslint-disable-next-line no-console
        console.error('');
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            details: err.details || null
        });
    }

    return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};
