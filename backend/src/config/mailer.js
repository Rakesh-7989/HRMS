// src/config/mailer.js
const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('./logger');

/**
 * Create nodemailer transporter
 */
const createTransporter = () => {
    // For development without proper SMTP credentials, use test mode
    if (env.NODE_ENV === 'development' && (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_PASS === 'your_smtp_password_here')) {
        logger.warn('No valid SMTP credentials found. Using test/console mode for emails.');

        return nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
        });
    }

    // Production SMTP configuration
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

const transporter = createTransporter();

/**
 * Send an email
 * @param {Object} mailOptions - Email options
 * @returns {Promise} Send result
 */
exports.sendMail = async (mailOptions) => {
    try {
        const defaultFrom = process.env.SMTP_FROM || 'noreply@hrms.com';

        const options = {
            from: mailOptions.from || defaultFrom,
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text,
            html: mailOptions.html,
            attachments: mailOptions.attachments
        };

        const info = await transporter.sendMail(options);

        logger.info('Email sent successfully:', {
            to: options.to,
            subject: options.subject,
            from: options.from
        });
        
        // Always log the email content in development mode
        if (env.NODE_ENV === 'development') {
            logger.info('Email Content:', {
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            });
        }

        return info;
    } catch (error) {
        logger.error('Error sending email:', {
            message: error.message,
            code: error.code,
            response: error.response,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Send welcome email
 */
exports.sendWelcomeEmail = async (to, name, tempPassword) => {
    return exports.sendMail({
        to,
        subject: 'Welcome to HRMS',
        html: `
            <h1>Welcome ${name}!</h1>
            <p>Your account has been created successfully.</p>
            <p>Your temporary password is: <strong>${tempPassword}</strong></p>
            <p>Please change your password after logging in.</p>
        `
    });
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return exports.sendMail({
        to,
        subject: 'Password Reset Request',
        html: `
            <h1>Password Reset</h1>
            <p>You requested a password reset.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    });
};

/**
 * Send leave request notification
 */
exports.sendLeaveNotification = async (to, employeeName, leaveType, startDate, endDate) => {
    return exports.sendMail({
        to,
        subject: 'Leave Request Notification',
        html: `
            <h1>Leave Request</h1>
            <p><strong>${employeeName}</strong> has requested leave.</p>
            <p><strong>Type:</strong> ${leaveType}</p>
            <p><strong>From:</strong> ${startDate}</p>
            <p><strong>To:</strong> ${endDate}</p>
        `
    });
};

/**
 * Send daily attendance report
 */
exports.sendDailyReport = async (to, reportData) => {
    return exports.sendMail({
        to,
        subject: `Daily Attendance Report - ${reportData.date}`,
        html: `
            <h1>Daily Attendance Report</h1>
            <p><strong>Date:</strong> ${reportData.date}</p>
            <p><strong>Total Employees:</strong> ${reportData.totalEmployees}</p>
            <p><strong>Present:</strong> ${reportData.present}</p>
            <p><strong>Absent:</strong> ${reportData.absent}</p>
            <p><strong>On Leave:</strong> ${reportData.onLeave}</p>
            <p><strong>Late Arrivals:</strong> ${reportData.lateArrivals}</p>
        `
    });
};

module.exports.transporter = transporter;
