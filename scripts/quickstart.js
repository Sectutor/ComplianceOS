#!/usr/bin/env node
/**
 * ComplianceOS Developer & Bare-Metal Quickstart
 * Run with: npm run quickstart
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║       🚀 ComplianceOS Developer & Bare-Metal Quickstart       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

// 1. Check Node version
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeVersion < 18) {
  console.error('❌ Node.js 18 or newer is required (found Node ' + process.version + ').');
  process.exit(1);
}
console.log('✅ Node.js ' + process.version + ' verified.');

// 2. Setup .env from .env.example
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env from .env.example with random cryptographic keys...');
  let envContent = fs.existsSync(envExamplePath)
    ? fs.readFileSync(envExamplePath, 'utf8')
    : '';

  const randKey = () => crypto.randomBytes(32).toString('hex');
  const adminPass = 'compliance-' + crypto.randomBytes(6).toString('hex');

  envContent = envContent
    .replace(/ENCRYPTION_KEY=.*/g, 'ENCRYPTION_KEY=' + randKey())
    .replace(/LOCAL_JWT_SECRET=.*/g, 'LOCAL_JWT_SECRET=' + randKey())
    .replace(/COMPLIANCE_ADMIN_PASSWORD=.*/g, 'COMPLIANCE_ADMIN_PASSWORD=' + adminPass);

  if (!envContent.includes('AUTH_MODE=')) {
    envContent += '\nAUTH_MODE=local\n';
  }
  if (!envContent.includes('VITE_ENABLE_PREMIUM=')) {
    envContent += 'VITE_ENABLE_PREMIUM=false\n';
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Generated .env with admin password: ' + adminPass);
} else {
  console.log('✅ Existing .env found.');
}

// 3. Launch dev community stack
console.log('\n🚀 Booting ComplianceOS Community Open-Core Stack...');
console.log('👉 Open http://localhost:5173 once Vite boots.\n');

try {
  execSync('npm run dev:community', { stdio: 'inherit' });
} catch (e) {
  console.log('Dev server stopped.');
}
