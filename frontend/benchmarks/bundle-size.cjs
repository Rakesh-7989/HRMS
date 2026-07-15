#!/usr/bin/env node
/**
 * Frontend Bundle Size Analyzer
 * Run: node benchmarks/bundle-size.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
  } catch (err) {
    console.error(`❌ ${cmd}: ${err.message}`);
    return '';
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const analyzeBundle = () => {
  console.log('📦 Frontend Bundle Size Analysis');
  console.log('='.repeat(60));

  // Use existing dist folder (already built)
  console.log('\n📦 Analyzing existing dist folder...');

  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(assetsPath)) {
    console.error('❌ No dist/assets folder found');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsPath);
  
  const analysis = {
    js: [],
    css: [],
    other: [],
    total: 0,
  };

  for (const file of files) {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    analysis.total += size;

    if (file.endsWith('.js')) {
      analysis.js.push({ file, size });
    } else if (file.endsWith('.css')) {
      analysis.css.push({ file, size });
    } else {
      analysis.other.push({ file, size });
    }
  }

  // Sort by size
  analysis.js.sort((a, b) => b.size - a.size);
  analysis.css.sort((a, b) => b.size - a.size);

  // Report
  console.log('\n📊 BUNDLE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Total bundle size: ${formatBytes(analysis.total)}`);
  console.log(`JS files: ${analysis.js.length} (${formatBytes(analysis.js.reduce((a, b) => a + b.size, 0))})`);
  console.log(`CSS files: ${analysis.css.length} (${formatBytes(analysis.css.reduce((a, b) => a + b.size, 0))})`);
  console.log(`Other: ${analysis.other.length} (${formatBytes(analysis.other.reduce((a, b) => a + b.size, 0))})`);

  console.log('\n📋 LARGEST JS FILES:');
  console.log('-'.repeat(80));
  console.log('File'.padEnd(50) + ' Size'.padStart(12) + ' % of JS'.padStart(10));
  console.log('-'.repeat(80));
  const totalJS = analysis.js.reduce((a, b) => a + b.size, 0);
  for (const item of analysis.js.slice(0, 20)) {
    const pct = ((item.size / totalJS) * 100).toFixed(1);
    console.log(item.file.substring(0, 48).padEnd(50) + formatBytes(item.size).padStart(12) + pct.padStart(9) + '%');
  }

  console.log('\n📋 CSS FILES:');
  console.log('-'.repeat(80));
  console.log('File'.padEnd(50) + ' Size'.padStart(12));
  console.log('-'.repeat(80));
  for (const item of analysis.css) {
    console.log(item.file.substring(0, 48).padEnd(50) + formatBytes(item.size).padStart(12));
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  
  const largeFiles = analysis.js.filter(f => f.size > 100 * 1024);
  if (largeFiles.length > 0) {
    console.log(`⚠️  ${largeFiles.length} JS files > 100KB - consider code splitting:`);
    for (const f of largeFiles.slice(0, 5)) {
      console.log(`   - ${f.file} (${formatBytes(f.size)})`);
    }
  }

  const totalKB = analysis.total / 1024;
  if (totalKB > 500) {
    console.log(`⚠️  Total bundle ${(totalKB/1024).toFixed(2)}MB > 500KB - consider lazy loading`);
  }

  // Gzip estimates
  console.log('\n📦 ESTIMATED GZIP SIZES (rough):');
  console.log('-'.repeat(80));
  const gzipEstimate = analysis.total * 0.25;
  console.log(`Total: ~${formatBytes(gzipEstimate)} (estimated 75% compression)`);
};

analyzeBundle();