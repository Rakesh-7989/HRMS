#!/usr/bin/env node
/**
 * Cron Scheduler for Month-End Diff
 * Runs month-end diff on 1st of each month at 02:00 UTC
 */

const { spawn } = require('child_process');
const cron = require('node-cron');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('⏰ Month-End Diff Scheduler Starting...');
console.log('='.repeat(50));

// Run on 1st of every month at 02:00 UTC
const schedule = '0 2 1 * *';

console.log(`📅 Scheduled: ${schedule} (1st of month at 02:00 UTC)`);
console.log('');

const runDiff = (tenantId) => {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 [${new Date().toISOString()}] Running month-end diff for tenant: ${tenantId || 'all'}`);
    
    const args = ['scripts/month-end-diff.js'];
    if (tenantId) args.push(tenantId);
    
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ [${new Date().toISOString()}] Month-end diff completed successfully`);
        resolve();
      } else {
        console.error(`❌ [${new Date().toISOString()}] Month-end diff failed with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      console.error(`❌ [${new Date().toISOString()}] Failed to spawn process:`, err);
      reject(err);
    });
  });
};

// Get all active tenants
async function getActiveTenants() {
  const { Pool } = require('pg');
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(
      `SELECT id FROM tenants WHERE is_active = true AND deleted_at IS NULL`
    );
    await pool.end();
    return result.rows.map(r => r.id);
  } catch (err) {
    console.error('Failed to get tenants:', err);
    await pool.end();
    return [];
  }
}

// Main cron job
cron.schedule(schedule, async () => {
  console.log(`\n🕐 [${new Date().toISOString()}] Cron triggered - Starting month-end diff`);
  
  try {
    const tenants = await getActiveTenants();
    console.log(`📋 Found ${tenants.length} active tenants`);
    
    for (const tenantId of tenants) {
      try {
        await runDiff(tenantId);
      } catch (err) {
        console.error(`Failed for tenant ${tenantId}:`, err.message);
        // Continue with other tenants
      }
    }
    
    console.log(`\n✅ [${new Date().toISOString()}] All month-end diffs completed`);
  } catch (err) {
    console.error('Cron job failed:', err);
  }
});

// Also run immediately if --now flag passed
if (process.argv.includes('--now')) {
  console.log('🚀 Running immediately (--now flag)...');
  runDiff().catch(console.error);
}

// Keep process alive
console.log('👂 Scheduler running... Press Ctrl+C to stop\n');