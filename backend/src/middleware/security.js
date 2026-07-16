/**
 * Security Middleware - Input Sanitization & XSS Protection
 * Prevents XSS attacks by sanitizing user input
 */
/**
 * Simple HTML entity encoder - fast XSS protection
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&apos;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes request body, query, and params to prevent XSS
 * Uses fast HTML entity encoding instead of heavy xss library
 * @param {Object} options - Options (kept for compatibility)
 * @returns {Function} Express middleware
 */
const sanitizeInput = (options = {}) => {
    return (req, res, next) => {
        const sanitize = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    // Fast HTML entity encoding
                    sanitized[key] = escapeHtml(value);
                } else if (typeof value === 'object' && value !== null) {
                    // Recursively sanitize nested objects
                    sanitized[key] = sanitize(value);
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        };

        // Sanitize body, query, and params
        if (req.body) req.body = sanitize(req.body);
        if (req.query) req.query = sanitize(req.query);
        if (req.params) req.params = sanitize(req.params);

        next();
    };
};

/**
 * Strips HTML tags from string values in object
 * @param {Object} obj - Object to strip
 * @returns {Object} Sanitized object
 */
const stripTags = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = stripTags(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

/**
 * Validates and sanitizes file uploads
 * @returns {Function} Express middleware
 */
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
    return (req, res, next) => {
        if (!req.file && !req.files) {
            return next();
        }

        const files = req.files ? Object.values(req.files).flat() : [req.file];

        for (const file of files) {
            // Check file type
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    status: 'error',
                    message: `File type ${file.mimetype} not allowed`
                });
            }

            // Check file size
            if (file.size > maxSize) {
                return res.status(400).json({
                    status: 'error',
                    message: `File size exceeds maximum allowed size of ${maxSize} bytes`
                });
            }

            // Check file extension
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
            const ext = require('path').extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                return res.status(400).json({
                    status: 'error',
                    message: `File extension ${ext} not allowed`
                });
            }
        }

        next();
    };
};

/**
 * Rate limiter for sensitive operations with IP tracking
 * @returns {Function} Express middleware
 */
const suspiciousActivityDetector = (threshold = 10, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();

    // Clean up old entries periodically
    setInterval(() => {
        const now = Date.now();
        for (const [ip, data] of attempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                attempts.delete(ip);
            }
        }
    }, 60000);

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!attempts.has(ip)) {
            attempts.set(ip, { count: 1, firstAttempt: now });
            return next();
        }

        const data = attempts.get(ip);
        data.count++;

        if (data.count > threshold) {
            return res.status(429).json({
                status: 'error',
                message: 'Suspicious activity detected. Please try again later.',
                retryAfter: Math.ceil((data.firstAttempt + 900000 - Date.now()) / 1000)
            });
        }

next();
    };
};

/**
 * Validates API key for internal service-to-service communication
 * @returns {Function} Express middleware
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validKeys = process.env.INTERNAL_API_KEYS?.split(',') || [];

    if (validKeys.length > 0 && !validKeys.includes(apiKey)) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid API key'
        });
    }

    next();
};

/**
 * Validates request size
 * @param {number} maxSize - Max request size in bytes
 * @returns {Function} Express middleware
 */
const validateRequestSize = (maxSize = 1 * 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > maxSize) {
            return res.status(413).json({
                status: 'error',
                message: `Request entity too large. Maximum size is ${maxSize} bytes`
            });
        }
        next();
    };
};

/**
 * Adds security headers for API responses
 * @returns {Function} Express middleware
 */
const apiSecurityHeaders = (req, res, next) => {
    // Prevent caching of sensitive responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent framing
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove server header
    res.removeHeader('X-Powered-By');
    
    next();
};

module.exports = {
    sanitizeInput,
    stripTags,
    validateFileUpload,
    suspiciousActivityDetector,
    validateApiKey,
    validateRequestSize,
    apiSecurityHeaders
};