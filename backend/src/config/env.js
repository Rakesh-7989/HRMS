// src/config/env.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });



const required = (key, fallback) => {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
};

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),

    DATABASE_URL: required('DATABASE_URL'),
    JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

    LOG_LEVEL: (process.env.LOG_LEVEL || 'debug').toLowerCase(),

    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Email config
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.hostinger.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM || 'noreply.hrms@WellZo.com',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'HR WellZo',
    DBA_PASSWORD: process.env.DBA_PASSWORD || 'dba_secret',

    // Encryption key for sensitive employee data (32-byte hex = 64 chars)
    ENCRYPTION_KEY: required('ENCRYPTION_KEY'),
};
