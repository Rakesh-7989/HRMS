// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const defaultKeyGenerator = (req) => req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
const ipKeyGenerator = defaultKeyGenerator;
const crypto = require('crypto');

const noopMiddleware = (req, res, next) => next();

const skipInTest = (limiter) => process.env.NODE_ENV === 'test' ? noopMiddleware : limiter;

/**
 * General API rate limiter
 * Applies to all API endpoints
 */
exports.generalLimiter = skipInTest(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs (reduced from 1000)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

/**
 * Strict rate limiter for authentication endpoints (login)
 * Prevents brute force attacks
 */
exports.authLimiter = skipInTest(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again after 15 minutes.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

/**
 * Rate limiter for OTP/2FA verification endpoints
 */
exports.otpLimiter = skipInTest(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 OTP verification requests per windowMs
    message: 'Too many verification attempts, please try again after 15 minutes.',
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many verification attempts. Please try again after 15 minutes.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

/**
 * Rate limiter for token refresh endpoints
 */
exports.refreshLimiter = skipInTest(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 refresh requests per windowMs
    message: 'Too many token refresh attempts, please try again later.',
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many refresh attempts. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

/**
 * Rate limiter for password reset requests
 * Includes per-email tracking via custom keyGenerator
 */
exports.passwordResetLimiter = skipInTest(rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: 'Too many password reset attempts, please try again later.',
    keyGenerator: (req) => {
        // Track by both IP and email hash to prevent email enumeration + distributed attacks
        const ip = ipKeyGenerator(req);
        const email = req.body?.email ? crypto.createHash('sha256').update(req.body.email.toLowerCase()).digest('hex').substring(0, 16) : 'no-email';
        return `${ip}:${email}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many password reset attempts. Please try again after 1 hour.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

/**
 * Rate limiter for file uploads
 */
exports.uploadLimiter = skipInTest(rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: 'Too many file uploads, please try again later.',
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Upload limit exceeded. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
}));

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
        keyGenerator: ipKeyGenerator,
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

/**
 * Redis store factory for production deployments
 * Returns null if Redis not configured (falls back to memory store)
 */
exports.createRedisStore = () => {
    try {
        const RedisStore = require('rate-limit-redis');
        const { createClient } = require('redis');
        
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            return null;
        }
        
        const redisClient = createClient({ url: redisUrl });
        redisClient.connect().catch(err => console.error('Redis connection error:', err));
        
        return new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
        });
    } catch (err) {
        // rate-limit-redis not installed or Redis not available
        return null;
    }
};