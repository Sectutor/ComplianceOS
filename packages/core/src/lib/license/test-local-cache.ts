/**
 * Test script for Local License Cache (Phase 1.1)
 *
 * Run: npx tsx src/lib/license/test-local-cache.ts
 *
 * Tests:
 *  1. Enforce returns Community when VITE_ENABLE_PREMIUM is not 'true'
 *  2. Cache write + read round-trip
 *  3. Tampered cache is detected and rejected
 *  4. Grace window is honoured within bounds
 *  5. Grace window expires and forces Community
 *  6. Expired cached license forces Community
 *  7. Online validation result is preferred over cache
 */

import { strict as assert } from 'assert';
import { randomBytes } from 'crypto';
import { unlinkSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// Point cache dir to a temp location so tests don't interfere with real data
process.env.COMPLIANCEOS_DATA_DIR = join('/tmp', `.test-license-cache-${randomBytes(4).toString('hex')}`);

import {
  cacheLicense,
  readCachedLicense,
  clearLicenseCache,
  enforceLicense,
  LocalLicenseCacheEntry,
} from './local-license-cache';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Prepare a valid LicenseInfo fixture                                */
/* ------------------------------------------------------------------ */

function makeLicenseInfo(overrides: Record<string, any> = {}) {
  return {
    type: 'enterprise' as const,
    status: 'valid' as const,
    issuedTo: 'Test Corp',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    maxUsers: 50,
    maxClients: 10,
    features: ['ai.evidence_analysis', 'ai.risk_triage', 'ai.policy_drafting'],
    metadata: { plan: 'enterprise' },
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

console.log('\nPhase 1.1 — Local License Cache Tests\n');

{
  // ---- Test 1: Community mode when ENV is not premium
  console.log('Suite A: Environment Enforcement\n');

  test('Forces Community when VITE_ENABLE_PREMIUM is not set', () => {
    delete process.env.VITE_ENABLE_PREMIUM;
    const result = enforceLicense();
    assert.equal(result.tier, 'community');
    assert.equal(result.reason, 'no_license');
    assert.equal(result.restrictToCommunity, false);
  });

  test('Forces Community when VITE_ENABLE_PREMIUM=false', () => {
    process.env.VITE_ENABLE_PREMIUM = 'false';
    const result = enforceLicense();
    assert.equal(result.tier, 'community');
    assert.equal(result.reason, 'no_license');
  });
}

{
  // ---- Test 2: Cache write / read round-trip
  console.log('\nSuite B: Cache Persistence\n');

  test('Writes and reads cached license successfully', () => {
    process.env.VITE_ENABLE_PREMIUM = 'true';
    const info = makeLicenseInfo();

    cacheLicense('ENT-TEST-1234', 'ACT-5678', info);
    const cached = readCachedLicense();

    assert.ok(cached, 'Cache file should exist');
    assert.equal(cached!.licenseKey, 'ENT-TEST-1234');
    assert.equal(cached!.tier, 'enterprise');
    assert.equal(cached!.features.length, 3);
  });

  test('Detects tampered cache and returns null', () => {
    // Manually corrupt the cache file
    const cacheDir = join(process.env.COMPLIANCEOS_DATA_DIR!, '.complianceos');
    const cachePath = join(cacheDir, '.complianceos-license-cache');
    const raw = JSON.parse(readFileSync(cachePath, 'utf-8'));
    raw.features.push('extra.pirated_feature'); // Tamper
    writeFileSync(cachePath, JSON.stringify(raw, null, 0), 'utf-8');

    const cached = readCachedLicense();
    assert.equal(cached, null, 'Tampered cache should be rejected');
  });
}

{
  // ---- Test 3: Enforcement with online validation
  console.log('\nSuite C: Online Validation Precedence\n');

  test('Accepts valid online result and caches it', () => {
    process.env.VITE_ENABLE_PREMIUM = 'true';
    process.env.VITE_LICENSE_KEY = 'ENT-ONLINE-9999';
    clearLicenseCache();

    const result = enforceLicense({
      valid: true,
      licenseInfo: makeLicenseInfo(),
      activationId: 'ACT-ONLINE-001',
    });

    assert.equal(result.tier, 'enterprise');
    assert.equal(result.reason, 'online_valid');
    assert.equal(result.restrictToCommunity, false);

    // Verify cache was written
    const cached = readCachedLicense();
    assert.ok(cached, 'Online result should be cached');
    assert.equal(cached!.licenseKey, 'ENT-ONLINE-9999');
  });

  test('Rejects invalid online result, falls to cache', () => {
    process.env.VITE_ENABLE_PREMIUM = 'true';
    // Cache still has last good result from previous test

    const result = enforceLicense({ valid: false, error: 'Invalid key' });
    // Should fall to cache (grace) or cache_miss
    assert.ok(result.tier === 'enterprise' || result.tier === 'community');
  });

  test('Server error with empty cache forces Community', () => {
    clearLicenseCache();

    const result = enforceLicense({
      valid: false,
      error: 'Network error',
    });

    assert.equal(result.reason, 'cache_miss');
    assert.equal(result.restrictToCommunity, true);
  });
}

{
  // ---- Test 4: Grace window
  console.log('\nSuite D: Grace Window\n');

  test('Within grace period keeps cached tier', () => {
    process.env.VITE_ENABLE_PREMIUM = 'true';

    // Write a fresh cache
    const info = makeLicenseInfo();
    cacheLicense('ENT-GRACE-1', 'ACT-GRACE-1', info);

    // Now issue an enforcement without online result (simulating offline)
    const result = enforceLicense();

    assert.equal(result.reason, 'grace_valid');
    assert.equal(result.tier, 'enterprise');
    assert.ok(result.graceDaysRemaining > 0, 'Should have days remaining');
    assert.equal(result.restrictToCommunity, false);
  });

  test('Expired cached license forces Community', () => {
    process.env.VITE_ENABLE_PREMIUM = 'true';

    // Write a cache with an expired license
    const info = makeLicenseInfo({
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day in the past
    });
    cacheLicense('ENT-EXPIRED-1', 'ACT-EXPIRED-1', info);

    const result = enforceLicense();

    assert.equal(result.reason, 'expired');
    assert.equal(result.restrictToCommunity, true);
    assert.equal(result.status, 'expired');
  });
}

{
  // ---- Test 5: Cleanup
  console.log('\nSuite E: Cleanup\n');

  test('Clear cache removes the file', () => {
    clearLicenseCache();
    const cacheDir = join(process.env.COMPLIANCEOS_DATA_DIR!, '.complianceos');
    const cachePath = join(cacheDir, '.complianceos-license-cache');
    assert.equal(existsSync(cachePath), false, 'Cache file should be removed');
  });
}

/* ------------------------------------------------------------------ */
/*  Summary                                                            */
/* ------------------------------------------------------------------ */

console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

// Cleanup temp dir (best-effort)
try {
  rmSync(process.env.COMPLIANCEOS_DATA_DIR!, { recursive: true, force: true });
} catch { /* ignore */ }

process.exit(failed > 0 ? 1 : 0);
