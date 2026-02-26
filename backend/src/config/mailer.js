const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('./logger');

/**
 * Icons (Hosted PNGs for best email compatibility)
 */
const icons = {
  checkCircle: 'https://img.icons8.com/ios-filled/50/16a34a/checked-checkbox.png',
  warning: 'https://img.icons8.com/ios-filled/50/f57f17/error.png',
  clock: 'https://img.icons8.com/ios-filled/50/888888/time.png',
  shield: 'https://img.icons8.com/ios-filled/50/dc2626/shield.png',
  sparkle: 'https://img.icons8.com/ios-filled/50/42275a/star.png',
  key: 'https://img.icons8.com/ios-filled/50/42275a/key.png',
  lock: 'https://img.icons8.com/ios-filled/50/42275a/lock.png',
  clipboard: 'https://img.icons8.com/ios-filled/50/42275a/clipboard.png',
  barChart: 'https://img.icons8.com/ios-filled/50/42275a/bar-chart.png',
  rocket: 'https://img.icons8.com/ios-filled/50/42275a/rocket.png',
};

/**
 * Handle template loading and rendering
 */
const renderTemplate = async (templateName, data = {}) => {
  try {
    const layoutPath = path.join(__dirname, '../templates/emails/layout.html');
    const templatePath = path.join(__dirname, `../templates/emails/${templateName}.html`);

    let layout = await fs.readFile(layoutPath, 'utf8');
    let content = await fs.readFile(templatePath, 'utf8');

    let html = layout.replace('{{{content}}}', content);

    // Dynamic icon helper replacement: {{{icon 'name' size}}}
    html = html.replace(/{{{icon '(\w+)' (\d+)}}}/g, (match, name, size) => {
      const iconUrl = icons[name] || icons.sparkle;
      return `<img src="${iconUrl}" width="${size}" height="${size}" alt="" style="display:inline-block;vertical-align:middle;border:0;" />`;
    });

    // Handle basic conditional for preheader
    if (data.preheader) {
      html = html.replace(/{{#if preheader}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      html = html.replace(/{{#if preheader}}([\s\S]*?){{\/if}}/g, '');
    }

    // Handle template data replacements {{var}} and {{{var}}}
    for (const [key, value] of Object.entries(data)) {
      const val = value !== undefined && value !== null ? String(value) : '';
      html = html.split(`{{${key}}}`).join(val);
      html = html.split(`{{{${key}}}}`).join(val);
    }

    return html;
  } catch (error) {
    logger.error(`Error rendering email template ${templateName}:`, error);
    throw error;
  }
};

/**
 * Create nodemailer transporter
 */
const createTransporter = () => {
  if (env.NODE_ENV === 'development' && (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_PASS === 'your_smtp_password_here')) {
    logger.warn('No valid SMTP credentials found. Using test/console mode for emails.');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

exports.sendMail = async (mailOptions) => {
  try {
    const defaultFrom = `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`;

    const options = {
      from: mailOptions.from || defaultFrom,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      attachments: mailOptions.attachments
    };

    const info = await transporter.sendMail(options);
    logger.info('Email sent successfully:', { to: options.to, subject: options.subject });
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Email Notification Services
 */

exports.sendWelcomeEmail = async (to, name, tempPassword) => {
  const html = await renderTemplate('welcome', {
    name,
    tempPassword,
    loginUrl: `${env.FRONTEND_URL}/login`,
    preheader: 'Welcome to WellZo HR! Your account is ready.'
  });

  return exports.sendMail({
    to,
    subject: 'Welcome to WellZo HR!',
    html
  });
};

exports.sendVerificationOTP = async (to, code) => {
  const html = await renderTemplate('verification_otp', {
    code,
    preheader: `Your verification code is ${code}`
  });

  return exports.sendMail({
    to,
    subject: 'Verify Your Email — WellZo HR',
    html
  });
};

exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = await renderTemplate('password_reset', {
    resetUrl,
    preheader: 'Reset your WellZo HR password'
  });

  return exports.sendMail({
    to,
    subject: 'Reset Your Password — WellZo HR',
    html
  });
};

exports.sendLeaveNotification = async (to, employeeName, leaveType, startDate, endDate) => {
  const html = await renderTemplate('leave_request', {
    employeeName,
    leaveType,
    startDate,
    endDate,
    dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
    preheader: `${employeeName} has requested ${leaveType} leave`
  });

  return exports.sendMail({
    to,
    subject: `Leave Request from ${employeeName}`,
    html
  });
};

exports.sendPasswordChangedNotification = async (to) => {
  const html = await renderTemplate('password_changed', {
    preheader: 'Your WellZo HR password has been changed'
  });

  return exports.sendMail({
    to,
    subject: 'Password Changed — WellZo HR',
    html
  });
};

exports.sendSubscriptionPricingEmail = async (to, tenantName, tenantId) => {
  const html = await renderTemplate('subscription_pricing', {
    tenantName,
    pricingUrl: `${env.FRONTEND_URL}/pricing?tenantId=${tenantId}`,
    preheader: 'Activate your WellZo HR subscription'
  });

  return exports.sendMail({
    to,
    subject: 'Activate Your WellZo HR Subscription',
    html
  });
};

exports.sendDailyReport = async (to, reportData) => {
  const presentPct = reportData.totalEmployees > 0 ? Math.round((reportData.present / reportData.totalEmployees) * 100) : 0;
  const html = await renderTemplate('daily_report', {
    reportDate: reportData.date,
    present: reportData.present,
    absent: reportData.absent,
    onLeave: reportData.onLeave,
    lateArrivals: reportData.lateArrivals,
    totalEmployees: reportData.totalEmployees,
    presentPct,
    preheader: `Daily Attendance Report for ${reportData.date}`
  });

  return exports.sendMail({
    to,
    subject: `Daily Attendance Report — ${reportData.date}`,
    html
  });
};

exports.sendSubscriptionRenewalEmail = async (to, tenantName, planName, expiryDate, type = 'reminder') => {
  const billingUrl = `${env.FRONTEND_URL}/dashboard/billing`;
  let subject = `Subscription Renewal Reminder — WellZo HR`;
  let message = `Your <strong>${planName}</strong> plan is set to expire on <strong>${expiryDate}</strong>. Renew now to ensure uninterrupted access to your HR tools.`;
  let buttonLabel = `Renew Now →`;
  let badgeColor = `#42275a`;
  let badgeText = `REMINDER`;

  if (type === 'urgent') {
    subject = `URGENT: Your WellZo HR Subscription Expires Soon`;
    message = `Your <strong>${planName}</strong> plan will expire in just 3 days on <strong>${expiryDate}</strong>. Please renew immediately to avoid service disruption.`;
    badgeColor = `#ea580c`;
    badgeText = `URGENT`;
  } else if (type === 'expired') {
    subject = `Your WellZo HR Subscription Has Expired`;
    message = `Your <strong>${planName}</strong> subscription has expired. Access to some features may be limited until you renew.`;
    buttonLabel = `Reactivate Plan →`;
    badgeColor = `#dc2626`;
    badgeText = `EXPIRED`;
  }

  const html = await renderTemplate('subscription_renewal', {
    tenantName,
    planName,
    expiryDate,
    message,
    buttonLabel,
    badgeColor,
    badgeText,
    billingUrl,
    preheader: subject
  });

  return exports.sendMail({
    to,
    subject,
    html
  });
};

module.exports.transporter = transporter;
