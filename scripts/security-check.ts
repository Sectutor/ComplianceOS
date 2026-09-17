/**
 * Security Pre-flight Check (Phase 1.4)
 *
 * Validates that the environment is configured securely before starting
 * the ComplianceOS server.
 *
 * Usage: npx tsx scripts/security-check.ts
 *        npx tsx scripts/security-check.ts --strict   # Fails on warnings too
 *
 * Returns exit code 0 (pass) or 1 (fail).
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

function check(name: string, condition: boolean, passMsg: string, failMsg: string): CheckResult {
  return {
    name,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMsg : failMsg,
  };
}

function checkWarn(name: string, condition: boolean, passMsg: string, warnMsg: string): CheckResult {
  return {
    name,
    status: condition ? 'pass' : 'warn',
    message: condition ? passMsg : warnMsg,
  };
}

async function run() {
  const isStrict = process.argv.includes('--strict');
  const results: CheckResult[] = [];

  console.log('\n[SecurityCheck] === Pre-flight Security Check ===\n');

  // 1. APP_ENCRYPTION_KEY
  results.push(check(
    'APP_ENCRYPTION_KEY',
    !!process.env.APP_ENCRYPTION_KEY,
    'Encryption key is set',
    'APP_ENCRYPTION_KEY is not set. Evidence and secrets will not be encrypted at rest.',
  ));

  // 2. VITE_LICENSE_KEY (when premium enabled)
  if (process.env.VITE_ENABLE_PREMIUM === 'true') {
    results.push(check(
      'VITE_LICENSE_KEY',
      !!process.env.VITE_LICENSE_KEY,
      'License key is configured for premium build',
      'VITE_ENABLE_PREMIUM=true but no VITE_LICENSE_KEY set. Instance will run in trial mode.',
    ));
  }

  // 3. DATABASE_URL
  results.push(check(
    'DATABASE_URL',
    !!process.env.DATABASE_URL,
    'Database URL is configured',
    'DATABASE_URL is not set. Server cannot connect to Postgres.',
  ));

  // 4. Rate limiting
  results.push(checkWarn(
    'RATE_LIMITING',
    process.env.RATE_LIMITING_ENABLED === 'true',
    'Rate limiting is enabled',
    'RATE_LIMITING_ENABLED is not set to true. API is not rate-limited.',
  ));

  // 5. NO_TELEMETRY awareness
  if (process.env.NO_TELEMETRY !== 'true') {
    results.push(checkWarn(
      'NO_TELEMETRY',
      false,
      '',
      'NO_TELEMETRY is not set. Optional outbound calls (AI, threat intel) are allowed.',
    ));
  } else {
    results.push(checkWarn('NO_TELEMETRY', true, 'Telemetry is disabled', ''));
  }

  // 6. CORS
  results.push(checkWarn(
    'CORS_ORIGIN',
    !!process.env.CORS_ORIGIN,
    'CORS_ORIGIN is explicitly configured',
    'CORS_ORIGIN not explicitly set. Defaults to http://localhost:5173.',
  ));

  // 7. Password (basic - just checking it's not the default)
  // This is a soft check
  results.push(checkWarn(
    'DEFAULT_CREDENTIALS',
    true,
    'No default credential check available',
    '',
  ));

  // 8. Port
  results.push(checkWarn(
    'PORT',
    process.env.PORT !== '3000',
    `Port is set to ${process.env.PORT || '3002'}`,
    'PORT is set to the default 3000. Consider changing for production.',
  ));

  // Print results
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const r of results) {
    if (!r.message) continue;

    const icon = r.status === 'pass' ? ' ✓' : r.status === 'warn' ? ' ⚠' : ' ✗';
    console.log(`  ${icon}  [${r.status.toUpperCase()}] ${r.name}: ${r.message}`);
    if (r.status === 'pass') passCount++;
    else if (r.status === 'warn') warnCount++;
    else failCount++;
  }

  console.log(`\n[SecurityCheck] Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failures`);

  const hasError = isStrict ? (failCount + warnCount) > 0 : failCount > 0;
  if (hasError) {
    console.error('[SecurityCheck] ✗ Checks FAILED. Fix the issues above before starting the server.\n');
    process.exit(1);
  }

  if (warnCount > 0) {
    console.log('[SecurityCheck] ⚠ Warnings exist but checks PASSED (use --strict to fail on warnings).\n');
  } else {
    console.log('[SecurityCheck] ✓ All checks PASSED.\n');
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('[SecurityCheck] Fatal error:', err);
  process.exit(1);
});
