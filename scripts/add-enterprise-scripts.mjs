#!/usr/bin/env node

/**
 * Script to add enterprise scalability scripts to package.json
 * This script adds the new server and infrastructure management scripts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add new scripts for enterprise scalability
const newScripts = {
  "server:enterprise": "tsx server-enterprise.ts",
  "server:enterprise:dev": "tsx --watch server-enterprise.ts",
  "server:enterprise:prod": "NODE_ENV=production tsx server-enterprise.ts",
  "infrastructure:init": "tsx scripts/infrastructure/init.ts",
  "infrastructure:health": "tsx scripts/infrastructure/health.ts",
  "infrastructure:metrics": "tsx scripts/infrastructure/metrics.ts",
  "cache:clear": "tsx scripts/cache/clear.ts",
  "cache:warm": "tsx scripts/cache/warm.ts",
  "db:optimize": "tsx scripts/database/optimize.ts",
  "db:migrate:enterprise": "tsx scripts/database/migrate-enterprise.ts",
  "performance:test": "tsx scripts/performance/test.ts",
  "performance:benchmark": "tsx scripts/performance/benchmark.ts",
  "load:test": "tsx scripts/performance/load-test.ts",
  "redis:setup": "tsx scripts/redis/setup.ts",
  "redis:monitor": "tsx scripts/redis/monitor.ts",
  "scaling:enable": "tsx scripts/scaling/enable.ts",
  "scaling:disable": "tsx scripts/scaling/disable.ts"
};

// Merge new scripts with existing ones
packageJson.scripts = {
  ...packageJson.scripts,
  ...newScripts
};

// Add new dependencies if not present
const newDependencies = {
  "ioredis": "^5.3.2",
  "express-rate-limit": "^8.2.1",
  "helmet": "^8.1.0",
  "prom-client": "^15.1.3"
};

packageJson.dependencies = {
  ...packageJson.dependencies,
  ...newDependencies
};

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Enterprise scalability scripts added to package.json');
console.log('');
console.log('New scripts available:');
Object.keys(newScripts).forEach(script => {
  console.log(`  npm run ${script}`);
});
console.log('');
console.log('Next steps:');
console.log('1. Install new dependencies: npm install');
console.log('2. Configure Redis server');
console.log('3. Copy .env.scalability to .env and configure');
console.log('4. Run: npm run server:enterprise:dev');