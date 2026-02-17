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

// ──────────────────────────────────────────────
// Icons (Hosted PNGs for best email compatibility)
// ──────────────────────────────────────────────
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

const icon = (name, size = 18) => `<img src="${icons[name]}" width="${size}" height="${size}" alt="" style="display:inline-block;vertical-align:middle;border:0;" />`;

// ──────────────────────────────────────────────
// Shared email layout wrapper for WellZo branding
// ──────────────────────────────────────────────
const emailWrapper = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WellZo HR</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f1f7;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(66,39,90,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);padding:32px 40px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-block;line-height:48px;margin-bottom:12px;">
                      <span style="font-size:24px;color:#ffffff;font-weight:800;">G</span>
                    </div>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:1px;">WellZo</p>
                    <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;">Human Resource Management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-top:1px solid #eee;padding-top:24px;"></td></tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                      Powered by <strong style="color:#42275a;">WellZo HR</strong>
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#bbb;">
                      This is an automated email. Please do not reply directly to this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send welcome email
 */
exports.sendWelcomeEmail = async (to, name, tempPassword) => {
  return exports.sendMail({
    to,
    subject: 'Welcome to WellZo HR!',
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a2e;font-weight:700;">Welcome, ${name}!</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.6;">Your account has been set up successfully. You're all set to get started with WellZo HR.</p>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5ff;background:linear-gradient(135deg,#faf5ff 0%,#f0e8f5 100%);border-radius:12px;border:1px solid #e8ddf0;margin-bottom:24px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 4px;font-size:11px;color:#42275a;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Temporary Password</p>
                  <p style="margin:0;font-size:28px;font-weight:800;color:#42275a;letter-spacing:2px;font-family:monospace;">${tempPassword}</p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-radius:10px;border:1px solid #ffe082;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#f57f17;">
                    ${icon('warning', 16)} <strong>Important:</strong> Please change your password immediately after your first login for security.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);">
                  <a href="${env.FRONTEND_URL}/login" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">Sign In to Your Account →</a>
                </td>
              </tr>
            </table>
        `, `Welcome to WellZo HR! Your account is ready.`)
  });
};

/**
 * Send email verification OTP
 */
exports.sendVerificationOTP = async (to, code) => {
  return exports.sendMail({
    to,
    subject: 'Verify Your Email — WellZo HR',
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;">Email Verification</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6;">Please enter the verification code below to confirm your email address.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center" style="background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);border-radius:14px;padding:32px;">
                  <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Your Verification Code</p>
                  <p style="margin:0;font-size:42px;font-weight:800;color:#ffffff;letter-spacing:10px;font-family:monospace;">${code}</p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6fa;border-radius:10px;margin-bottom:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                    ${icon('clock', 14)} This code expires in <strong style="color:#42275a;">10 minutes</strong>.<br>
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
        `, `Your verification code is ${code}`)
  });
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  return exports.sendMail({
    to,
    subject: 'Reset Your Password — WellZo HR',
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;">Password Reset</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6;">We received a request to reset your password. Click the button below to create a new one.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);">
                        <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">Reset My Password →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6fa;border-radius:10px;margin-bottom:16px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#888;">If the button doesn't work, copy and paste this link:</p>
                  <p style="margin:0;font-size:12px;color:#42275a;word-break:break-all;">${resetUrl}</p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-radius:10px;border:1px solid #ffe082;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#f57f17;">
                    ${icon('clock', 14)} This link expires in <strong>1 hour</strong>. If you didn't request a reset, please ignore this email.
                  </p>
                </td>
              </tr>
            </table>
        `, `Reset your WellZo HR password`)
  });
};

/**
 * Send leave request notification
 */
exports.sendLeaveNotification = async (to, employeeName, leaveType, startDate, endDate) => {
  return exports.sendMail({
    to,
    subject: `Leave Request from ${employeeName}`,
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;">Leave Request</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6;">A team member has submitted a leave request that requires your attention.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;border:1px solid #e8ddf0;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background-color:#faf5ff;background:linear-gradient(135deg,#faf5ff 0%,#f0e8f5 100%);padding:20px 24px;border-bottom:1px solid #e8ddf0;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#42275a;">${employeeName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;width:35%;">
                        <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Leave Type</p>
                        <p style="margin:4px 0 0;font-size:15px;color:#333;font-weight:600;">${leaveType}</p>
                      </td>
                      <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;">
                        <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Duration</p>
                        <p style="margin:4px 0 0;font-size:15px;color:#333;font-weight:600;">${startDate} — ${endDate}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);">
                  <a href="${env.FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">Review Request →</a>
                </td>
              </tr>
            </table>
        `, `${employeeName} has requested ${leaveType} leave`)
  });
};

/**
 * Send password changed notification
 */
exports.sendPasswordChangedNotification = async (to) => {
  return exports.sendMail({
    to,
    subject: 'Password Changed — WellZo HR',
    html: emailWrapper(`
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <div style="width:64px;height:64px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:50%;display:inline-block;line-height:64px;margin-bottom:16px;">
                    ${icon('checkCircle', 32)}
                  </div>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;text-align:center;">Password Changed Successfully</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.6;text-align:center;">Your WellZo HR password was recently changed.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#dc2626;line-height:1.6;">
                    ${icon('shield', 16)} <strong>Didn't make this change?</strong><br>
                    Contact your organization's administrator immediately to secure your account.
                  </p>
                </td>
              </tr>
            </table>
        `, `Your WellZo HR password has been changed`)
  });
};

/**
 * Send subscription pricing email
 */
exports.sendSubscriptionPricingEmail = async (to, tenantName, tenantId) => {
  const pricingUrl = `${env.FRONTEND_URL}/pricing?tenantId=${tenantId}`;

  return exports.sendMail({
    to,
    subject: 'Activate Your WellZo HR Subscription',
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;">Hello, ${tenantName}!</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6;">A Super Admin has enabled your organization's subscription access. Select a plan below to unlock all features.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5ff;background:linear-gradient(135deg,#faf5ff 0%,#f0e8f5 100%);border-radius:12px;border:1px solid #e8ddf0;margin-bottom:24px;">
              <tr>
                <td style="padding:24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="40" valign="top">${icon('sparkle', 24)}</td>
                      <td style="padding-left:12px;">
                        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#42275a;">What's included?</p>
                        <p style="margin:0;font-size:13px;color:#666;line-height:1.8;">
                          Employee Management • Attendance Tracking • Leave Management<br>
                          Payroll Processing • Performance Reviews • And much more
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:10px;background-color:#42275a;background:linear-gradient(135deg,#42275a 0%,#734b6d 100%);">
                        <a href="${pricingUrl}" style="display:inline-block;padding:14px 40px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">View Pricing Plans →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
        `, `Activate your WellZo HR subscription`)
  });
};

/**
 * Send daily attendance report
 */
exports.sendDailyReport = async (to, reportData) => {
  const presentPct = reportData.totalEmployees > 0 ? Math.round((reportData.present / reportData.totalEmployees) * 100) : 0;

  return exports.sendMail({
    to,
    subject: `Daily Attendance Report — ${reportData.date}`,
    html: emailWrapper(`
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;font-weight:700;">Attendance Report</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6;">Here's the attendance summary for <strong>${reportData.date}</strong>.</p>

            <!-- Stats Grid -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="50%" style="padding:0 6px 12px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <p style="margin:0;font-size:28px;font-weight:800;color:#16a34a;">${reportData.present}</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Present</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 12px 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <p style="margin:0;font-size:28px;font-weight:800;color:#dc2626;">${reportData.absent}</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Absent</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 6px 0 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <p style="margin:0;font-size:28px;font-weight:800;color:#2563eb;">${reportData.onLeave}</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">On Leave</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <p style="margin:0;font-size:28px;font-weight:800;color:#ea580c;">${reportData.lateArrivals}</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Late Arrivals</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Summary Bar -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5ff;background:linear-gradient(135deg,#faf5ff 0%,#f0e8f5 100%);border-radius:10px;border:1px solid #e8ddf0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#42275a;">
                    <strong>Total Employees:</strong> ${reportData.totalEmployees} &nbsp;|&nbsp; <strong>Attendance Rate:</strong> ${presentPct}%
                  </p>
                </td>
              </tr>
            </table>
        `, `Daily Attendance Report for ${reportData.date}`)
  });
};

module.exports.transporter = transporter;
