const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

/**
 * PRODUCTION PIPELINE CONFIGURATION
 */
const CONFIG = {
  branch: 'prod',
  pollInterval: 60 * 1000,
  debounceTime: 5 * 60 * 1000,
  projectRoot: path.join(__dirname, '..'),
  logDir: path.join(__dirname, '../logs'),
  backupDir: path.join(__dirname, '../backups'),
  commands: {
    frontend: [
      'npm install --production=false',
      'npm run build',
      'sudo rm -rf /var/www/html/*',
      'sudo cp -r dist/* /var/www/html/',
      'sudo chown -R www-data:www-data /var/www/html'
    ],
    backend: [
      'npm install --production'
    ],
    restart: 'pm2 restart hrms-backend'
  },
  email: {
    enabled: true,
    to: 'prasadk@WellZo.com', // Recipient for notifications
    from: process.env.EMAIL_FROM || 'noreply.hrms@WellZo.com'
  }
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.logDir)) fs.mkdirSync(CONFIG.logDir, { recursive: true });
if (!fs.existsSync(CONFIG.backupDir)) fs.mkdirSync(CONFIG.backupDir, { recursive: true });

const logFile = path.join(CONFIG.logDir, `deploy-${new Date().toISOString().split('T')[0]}.log`);

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString();
  const formattedMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(logFile, formattedMessage + '\n');
}

/**
 * Clean up logs older than 30 days
 */
function rotateLogs() {
  try {
    const files = fs.readdirSync(CONFIG.logDir);
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(CONFIG.logDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 30 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        log(`Deleted old log file: ${file}`);
      }
    });
  } catch (err) {
    log('Log rotation failed: ' + err.message, 'WARNING');
  }
}

/**
 * Creates a database backup
 */
async function backupDatabase() {
  const backupFile = path.join(CONFIG.backupDir, `pre-deploy-${Date.now()}.sql`);
  log(`Creating database backup: ${backupFile}...`);
  try {
    // Requires pg_dump installed on the server
    await run(`pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`);
    log('Backup created successfully.');
  } catch (err) {
    log('Database backup failed. Proceeding with caution... Error: ' + err.message, 'WARNING');
  }
}

async function sendEmailNotification(status, details) {
  if (!CONFIG.email.enabled) return;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const subject = status === 'SUCCESS' ? '✅ DEPLOYMENT SUCCESS - HRMS' : '❌ DEPLOYMENT FAILED - HRMS';
  const html = `
    <h2>Deployment ${status}</h2>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Branch:</strong> ${CONFIG.branch}</p>
    <hr/>
    <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${details}</pre>
    <p>Logs available at: <code>${logFile}</code></p>
  `;

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'HRMS Deployer'}" <${CONFIG.email.from}>`,
      to: CONFIG.email.to,
      subject: subject,
      html: html
    });
    log('Notification email sent.');
  } catch (err) {
    log('Failed to send email: ' + err.message, 'ERROR');
  }
}

function run(cmd, cwd = CONFIG.projectRoot) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${cmd}`);
    exec(cmd, { cwd, shell: true }, (error, stdout, stderr) => {
      if (stdout) fs.appendFileSync(logFile, stdout);
      if (stderr) fs.appendFileSync(logFile, stderr);
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

let debounceTimer = null;
let isDeploying = false;

async function performDeployment() {
  if (isDeploying) return;
  isDeploying = true;
  let summary = 'Deployment Log:\n';
  
  log('--- STARTING DEPLOYMENT ---', 'PROCESS');
  try {
    // 1. Pull changes exactly like manual process
    summary += '- Git Stash & Pull\n';
    await run('git stash');
    await run(`git pull origin ${CONFIG.branch}`);
    await run('git stash pop').catch(() => log('Nothing to pop from stash.', 'WARNING'));

    // 2. Database Step
    summary += '- DB Backup & Migration\n';
    await backupDatabase();
    await run('node scripts/db-migrate.js');

    // 3. Frontend Build & Deploy
    summary += '- Frontend build and copy to webroot\n';
    const frontendDir = path.join(CONFIG.projectRoot, 'frontend');
    for (const cmd of CONFIG.commands.frontend) {
      await run(cmd, frontendDir);
    }

    // 4. Backend Update
    summary += '- Backend update\n';
    const backendDir = path.join(CONFIG.projectRoot, 'backend');
    for (const cmd of CONFIG.commands.backend) {
      await run(cmd, backendDir);
    }

    // 5. Restart
    summary += '- Restart Service\n';
    await run(CONFIG.commands.restart);

    log('--- DEPLOYMENT COMPLETED SUCCESSFULY ---', 'SUCCESS');
    await sendEmailNotification('SUCCESS', summary + '\nStatus: Live');
    rotateLogs();
  } catch (err) {
    log('--- DEPLOYMENT FAILED ---', 'ERROR');
    log(err.message, 'ERROR');
    await sendEmailNotification('FAILED', summary + `❌ ERROR: ${err.message}`);
  } finally {
    isDeploying = false;
    // Update hash after successful deployment to match what we just pulled
    try {
      lastSeenHash = (await run('git rev-parse HEAD')).trim();
    } catch (e) {}
  }
}

async function checkForChanges() {
  if (isDeploying) return;
  try {
    await run('git fetch origin');
    
    // Get the latest hash on the remote branch
    const currentRemoteHash = (await run(`git rev-parse origin/${CONFIG.branch}`)).trim();
    
    // If we haven't seen a hash yet, initialize it
    if (!lastSeenHash) {
      const localHash = (await run('git rev-parse HEAD')).trim();
      lastSeenHash = localHash;
    }

    // Only act if the remote hash is different from what we last saw
    if (currentRemoteHash !== lastSeenHash) {
      if (debounceTimer) {
        log(`New push detected (${currentRemoteHash.substring(0,7)}). Resetting 5-minute timer.`);
        clearTimeout(debounceTimer);
      } else {
        log(`Push detected (${currentRemoteHash.substring(0,7)}). Deployment scheduled in 5 minutes.`);
      }
      
      lastSeenHash = currentRemoteHash;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        performDeployment();
      }, CONFIG.debounceTime);
    }
  } catch (err) {}
}

log(`Master auto-deploy watcher active. Branch: ${CONFIG.branch}`);
checkForChanges();
setInterval(checkForChanges, CONFIG.pollInterval);
