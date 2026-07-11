const logger = require('../config/logger');

module.exports = function requestLogger(req, res, next) {
    const start = Date.now();

    console.log(`\n  ${req.method} ${req.path}`);

    // Protect against undefined body
    const safeBody =
        req.body && typeof req.body === 'object'
            ? req.body
            : {};

    if (Object.keys(safeBody).length > 0) {
        const REDACTED_FIELDS = ['password', 'refresh_token', 'token', 'newPassword', 'currentPassword', 'secret', 'authorization'];
        const redacted = { ...safeBody };
        for (const field of REDACTED_FIELDS) {
            if (redacted[field] !== undefined) {
                redacted[field] = '***REDACTED***';
            }
        }
        console.log(
            '   Body:',
            JSON.stringify(redacted, null, 2).substring(0, 200)
        );
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        const reset = '\x1b[0m';

        console.log(
            `  ${statusColor}${res.statusCode}${reset} ${req.method} ${req.path} - ${duration}ms\n`
        );
    });

    logger.info(
        {
            method: req.method,
            path: req.path,
            ip: req.ip
        },
        'Incoming request'
    );

    next();
};
