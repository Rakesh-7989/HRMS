// src/utils/jwtHelper.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_ALGORITHM = 'HS256';

class TokenExpiredError extends Error {
    constructor(message = 'Token expired') {
        super(message);
        this.name = 'TokenExpiredError';
    }
}

class TokenMalformedError extends Error {
    constructor(message = 'Token malformed') {
        super(message);
        this.name = 'TokenMalformedError';
    }
}

class TokenInvalidError extends Error {
    constructor(message = 'Token invalid') {
        super(message);
        this.name = 'TokenInvalidError';
    }
}

exports.TokenExpiredError = TokenExpiredError;
exports.TokenMalformedError = TokenMalformedError;
exports.TokenInvalidError = TokenInvalidError;

/**
 * Generate a JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default from env)
 * @returns {string} JWT token
 */
exports.generateAccessToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn, algorithm: JWT_ALGORITHM });
};

/**
 * Generate a JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default from env)
 * @returns {string} JWT token
 */
exports.generateRefreshToken = (payload, expiresIn = env.REFRESH_TOKEN_EXPIRES_IN) => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn, algorithm: JWT_ALGORITHM });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key (default: JWT_SECRET)
 * @param {Object} options - Additional verify options
 * @returns {Object} Decoded payload
 * @throws {TokenExpiredError|TokenMalformedError|TokenInvalidError}
 */
exports.verifyToken = (token, secret = env.JWT_ACCESS_SECRET, options = {}) => {
    try {
        return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM], ...options });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new TokenExpiredError();
        }
        if (error.name === 'JsonWebTokenError') {
            throw new TokenMalformedError();
        }
        throw new TokenInvalidError();
    }
};

/**
 * Decode a JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null if invalid
 */
exports.decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
exports.extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7).trim();
    return token || null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
exports.isTokenExpired = (token) => {
    try {
        const decoded = exports.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        return decoded.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
exports.getTokenExpiration = (token) => {
    try {
        const decoded = exports.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return null;
        }
        return new Date(decoded.exp * 1000);
    } catch {
        return null;
    }
};

/**
 * Get remaining time until token expiration in seconds
 * @param {string} token - JWT token
 * @returns {number} Remaining seconds or 0 if expired
 */
exports.getTokenRemainingTime = (token) => {
    try {
        const decoded = exports.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return 0;
        }
        const remaining = decoded.exp - Math.floor(Date.now() / 1000);
        return remaining > 0 ? remaining : 0;
    } catch {
        return 0;
    }
};