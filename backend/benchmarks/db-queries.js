#!/usr/bin/env node
/**
 * Database Query Performance Benchmarks
 * Run: node benchmarks/db-queries.js
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hrms_user:hrms_pass@localhost:5432/hrms_saas_test',
  max: 20,
});

const queries = [
  {
    name: 'Get user by email',
    sql: `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    params: ['test@example.com'],
    iterations: 100,
  },
  {
    name: 'Get user with tenant and role',
    sql: `
      SELECT u.*, t.name as tenant_name, r.name as role_name
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `,
    params: ['test@example.com'],
    iterations: 100,
  },
  {
    name: 'Get employee list with pagination',
    sql: `
      SELECT e.*, u.email, u.first_name, u.last_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.tenant_id = $1
      ORDER BY e.created_at DESC
      LIMIT 20 OFFSET 0
    `,
    params: ['00000000-0000-0000-0000-000000000001'],
    iterations: 100,
  },
  {
    name: 'Get attendance for date range',
    sql: `
      SELECT a.*, e.employee_code, u.first_name, u.last_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE a.tenant_id = $1
        AND a.date BETWEEN $2 AND $3
      ORDER BY a.date DESC
    `,
    params: ['00000000-0000-0000-0000-000000000001', '2024-01-01', '2024-01-31'],
    iterations: 50,
  },
  {
    name: 'Get leave requests with joins',
    sql: `
      SELECT lr.*, e.employee_code, u.first_name, u.last_name, lt.name as leave_type
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.tenant_id = $1
      ORDER BY lr.created_at DESC
      LIMIT 50
    `,
    params: ['00000000-0000-0000-0000-000000000001'],
    iterations: 50,
  },
  {
    name: 'Complex payroll query',
    sql: `
      SELECT 
        e.employee_code,
        u.first_name,
        u.last_name,
        SUM(pr.gross_pay) as total_gross,
        SUM(pr.net_pay) as total_net,
        COUNT(pr.id) as payroll_count
      FROM payroll_runs pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE pr.tenant_id = $1
        AND pr.pay_date BETWEEN $2 AND $3
      GROUP BY e.employee_code, u.first_name, u.last_name
      ORDER BY total_gross DESC
      LIMIT 20
    `,
    params: ['00000000-0000-0000-0000-000000000001', '2024-01-01', '2024-12-31'],
    iterations: 20,
  },
];

const runQuery = async (pool, query) => {
  const start = performance.now();
  try {
    await pool.query(query.sql, query.params);
    return performance.now() - start;
  } catch (err) {
    throw new Error(`${query.name}: ${err.message}`);
  }
};

const runBenchmark = async (query) => {
  console.log(`\n📊 Benchmarking: ${query.name}`);
  console.log('─'.repeat(60));

  // Warmup
  for (let i = 0; i < 5; i++) {
    await runQuery(pool, query);
  }

  const times = [];
  for (let i = 0; i < query.iterations; i++) {
    const time = await runQuery(pool, query);
    times.push(time);
  }

  times.sort((a, b) => a - b);
  
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const min = times[0];
  const max = times[times.length - 1];

  console.log(`  Iterations:    ${query.iterations}`);
  console.log(`  Min:           ${min.toFixed(2)} ms`);
  console.log(`  Avg:           ${avg.toFixed(2)} ms`);
  console.log(`  Median (P50):  ${p50.toFixed(2)} ms`);
  console.log(`  P95:           ${p95.toFixed(2)} ms`);
  console.log(`  P99:           ${p99.toFixed(2)} ms`);
  console.log(`  Max:           ${max.toFixed(2)} ms`);

  return {
    name: query.name,
    iterations: query.iterations,
    min,
    avg,
    p50,
    p95,
    p99,
    max,
  };
};

const runAllBenchmarks = async () => {
  console.log('Starting Database Query Benchmarks');
  console.log('='.repeat(60));

  const results = [];

  for (const query of queries) {
    try {
      const result = await runBenchmark(query);
      results.push(result);
    } catch (err) {
      console.error('  Failed:', err.message);
      results.push({ name: query.name, error: err.message });
    }
  }

  await pool.end();

console.log('\n' + '='.repeat(60));
  console.log('DB QUERY BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  console.log('Query'.padEnd(35) + ' Avg(ms)'.padStart(10) + ' P50(ms)'.padStart(10) + ' P95(ms)'.padStart(10) + ' P99(ms)'.padStart(10));
  console.log('-'.repeat(75));
  
  for (const r of results) {
    if (r.error) {
      console.log(r.name.padEnd(35) + ' ERROR: ' + r.error);
    } else {
      console.log(r.name.padEnd(35) + r.avg.toFixed(2).padStart(10) + r.p50.toFixed(2).padStart(10) + r.p95.toFixed(2).padStart(10) + r.p99.toFixed(2).padStart(10));
    }
  }
};

runAllBenchmarks().catch(console.error);