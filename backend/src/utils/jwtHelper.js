// src/utils/jwtHelper.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default from env)
 * @returns {string} JWT token
 */
exports.generateAccessToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn });
};

/**
 * Generate a JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default from env)
 * @returns {string} JWT token
 */
exports.generateRefreshToken = (payload, expiresIn = env.REFRESH_TOKEN_EXPIRES_IN) => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key (default: JWT_SECRET)
 * @returns {Objectnull} Decoded payload or null if invalid
 */
exports.verifyToken = (token, secret = env.JWT_ACCESS_SECRET) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

/**
 * Decode a JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Objectnull} Decoded payload or null if invalid
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
 * @returns {stringnull} Extracted token or null
 */
exports.extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
exports.isTokenExpired = (token) => {
    const decoded = exports.decodeToken(token);
    if (!decoded || !decoded.exp) {
        return true;
    }
    return decoded.exp * 1000 < Date.now();
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Datenull} Expiration date or null
 */
exports.getTokenExpiration = (token) => {
    const decoded = exports.decodeToken(token);
    if (!decoded || !decoded.exp) {
        return null;
    }
    return new Date(decoded.exp * 1000);
};

/**
 * Get remaining time until token expiration in seconds
 * @param {string} token - JWT token
 * @returns {number} Remaining seconds or 0 if expired
 */
exports.getTokenRemainingTime = (token) => {
    const decoded = exports.decodeToken(token);
    if (!decoded || !decoded.exp) {
        return 0;
    }
    const remaining = decoded.exp - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : 0;
};
