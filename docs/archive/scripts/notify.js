const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const status = process.argv[2] || 'SUCCESS';
const details = process.argv[3] || 'The deployment finished successfully via GitHub Actions.';

async function sendEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const subject = status === 'SUCCESS' 
    ? '✅ Deployment Successful - HRMS (GitHub Actions)' 
    : '❌ Deployment FAILED - HRMS (GitHub Actions)';

  const html = `
    <h2>Deployment ${status}</h2>
    <p><strong>Method:</strong> GitHub Actions</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <hr/>
    <p>${details}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'HRMS Deployer'}" <${process.env.EMAIL_FROM}>`,
      to: 'prasadk@WellZo.com',
      subject: subject,
      html: html
    });
    console.log('Notification email sent.');
  } catch (err) {
    console.error('Failed to send notification email:', err.message);
    process.exit(1);
  }
}

sendEmail();
