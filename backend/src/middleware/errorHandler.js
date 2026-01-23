
const { AppError } = require('../utils/customErrors');
const logger = require('../config/logger');

module.exports = function errorHandler(err, req, res, next) {
    logger.error({ err }, 'Request error');

    // Also log to console for better visibility in development
    if (process.env.NODE_ENV === 'development') {
        console.error('\n ERROR in', req.method, req.path);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
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
