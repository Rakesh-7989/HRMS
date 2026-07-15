#!/usr/bin/env node
/**
 * Month-End Diff Cron Job
 * Runs automatically on the 1st of each month at 2:00 AM
 * Usage: node scripts/month-end-diff-cron.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const TENANT_IDS = process.env.DIFF_TENANT_IDS?.split(',').map(t => t.trim()) || [
  '00000000-0000-0000-0000-000000000001',
];

const runDiff = (tenantId, prevMonth, currMonth) => {
  return new Promise((resolve, reject) => {
    const args = ['scripts/month-end-diff.js', tenantId];
    if (prevMonth) args.push(prevMonth);
    if (currMonth) args.push(currMonth);

    const child = spawn('node', args, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Diff completed for ${tenantId}`);
        resolve();
      } else {
        console.error(`❌ Diff failed for ${tenantId} (exit code: ${code})`);
        reject(new Error(`Exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error(`❌ Failed to spawn for ${tenantId}:`, err);
      reject(err);
    });
  };
};

const runMonthlyDiff = async () => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const prevStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const currStr = `${currMonth.getFullYear()}-${String(currMonth.getMonth() + 1).padStart(2, '0')}`;

  console.log(`\n🕐 ${new Date().toISOString()} - Starting monthly diff for ${prevStr} → ${currStr}`);
  console.log('─'.repeat(60));

  const results = await Promise.allSettled(
    TENANT_IDS.map(tenantId => runDiff(tenantId, prevStr, currStr))
  );

  const failed = results.filter(r => r.status === 'rejected');
  const succeeded = results.filter(r => r.status === 'fulfilled');

  console.log('\n📊 Summary:');
  console.log(`  ✅ Succeeded: ${succeeded.length}/${TENANT_IDS.length}`);
  console.log(`  ❌ Failed:    ${failed.length}/${TENANT_IDS.length}`);

  if (failed.length > 0) {
    failed.forEach((r, i) => {
      console.error(`  ${TENANT_IDS[i]}: ${r.reason?.message || r.reason}`);
    });
  }

  console.log('─'.repeat(60));
  console.log(`✅ Monthly diff completed at ${new Date().toISOString()}\n`);
};

// Schedule: 1st of every month at 02:00 AM
cron.schedule('0 2 1 * *', runMonthlyDiff, {
  scheduled: true,
  timezone: 'Asia/Kolkata',
});

console.log('🕐 Month-End Diff Cron Started');
console.log('Schedule: 1st of every month at 02:00 AM (IST)');
console.log(`Tenants: ${TENANT_IDS.join(', ')}`);
console.log('Press Ctrl+C to stop\n');

// Run immediately on startup (optional - comment out if not needed)
if (process.argv.includes('--run-now')) {
  runMonthlyDiff();
}

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping cron job...');
  process.exit(0);
});