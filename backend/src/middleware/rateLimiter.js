// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all API endpoints
 */
exports.generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again after 15 minutes.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * Rate limiter for password reset requests
 */
exports.passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: 'Too many password reset attempts, please try again later.',
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many password reset attempts. Please try again after 1 hour.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * Rate limiter for file uploads
 */
exports.uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: 'Too many file uploads, please try again later.',
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Upload limit exceeded. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * Create a custom rate limiter with specific options
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limiter middleware
 */
exports.createLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: options.message || 'Too many requests, please try again later.',
                retryAfter: req.rateLimit.resetTime
            });
        }
    };

    return rateLimit({ ...defaultOptions, ...options });
};
