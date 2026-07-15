#!/usr/bin/env node
/**
 * API Latency Benchmarks using autocannon
 * Run: node benchmarks/api-latency.js
 */

const autocannon = require('autocannon');

const BASE_URL = process.env.BENCH_URL || 'https://backend-site-tracker-pro-s-projects.vercel.app/api';

const endpoints = [
  { path: '/auth/login', method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'TestPass@123' }) },
  { path: '/auth/refresh', method: 'POST', body: JSON.stringify({ refresh_token: 'dummy-token' }) },
  { path: '/health', method: 'GET' },
];

const runBenchmark = async (endpoint) => {
  const url = `${BASE_URL}${endpoint.path}`;
  
  console.log(`\n📊 Benchmarking: ${endpoint.method} ${endpoint.path}`);
  console.log('─'.repeat(60));
  
  const result = await autocannon({
    url,
    method: endpoint.method,
    body: endpoint.body,
    headers: {
      'Content-Type': 'application/json',
    },
    connections: 10,
    duration: 30,
    pipelining: 1,
    bailout: 1000,
    workers: 4,
  });

  console.log(`  Requests/sec:     ${result.requests.mean.toFixed(2)}`);
  console.log(`  Latency (avg):    ${result.latency.mean.toFixed(2)} ms`);
  console.log(`  Latency (p50):    ${result.latency.p50.toFixed(2)} ms`);
  console.log(`  Latency (p95):    ${result.latency.p95.toFixed(2)} ms`);
  console.log(`  Latency (p99):    ${result.latency.p99.toFixed(2)} ms`);
  console.log(`  Throughput:       ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`  Errors:           ${result.errors}`);
  console.log(`  Timeouts:         ${result.timeouts}`);
  console.log(`  Non-2xx:          ${result.non2xx}`);

  return {
    endpoint: `${endpoint.method} ${endpoint.path}`,
    rps: result.requests.mean,
    latencyAvg: result.latency.mean,
    latencyP50: result.latency.p50,
    latencyP95: result.latency.p95,
    latencyP99: result.latency.p99,
    throughput: result.throughput.mean,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
  };
};

const runAllBenchmarks = async () => {
  console.log('🚀 Starting API Latency Benchmarks');
  console.log(`Target: ${BASE_URL}`);
  console.log('='.repeat(60));

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await runBenchmark(endpoint);
      results.push(result);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      results.push({ endpoint: `${endpoint.method} ${endpoint.path}`, error: err.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  console.log(`${'Endpoint':<25} ${'RPS':>10} ${'Avg(ms)':>10} ${'P95(ms)':>10} ${'P99(ms)':>10} ${'Errors':>8}`);
  console.log('-'.repeat(73));
  
  for (const r of results) {
    if (r.error) {
      console.log(`${r.endpoint:<25} ${'ERROR':>10} ${r.error}`);
    } else {
      console.log(`${r.endpoint:<25} ${r.rps.toFixed(2).padStart(10)} ${r.latencyAvg.toFixed(2).padStart(10)} ${r.latencyP95.toFixed(2).padStart(10)} ${r.latencyP99.toFixed(2).padStart(10)} ${r.errors.toString().padStart(8)}`);
    }
  }
};

runAllBenchmarks().catch(console.error);