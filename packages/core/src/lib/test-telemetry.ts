/**
 * Test script for Telemetry Control (Phase 1.2)
 *
 * Run: cd packages/core && npx tsx src/lib/test-telemetry.ts
 */

import { strict as assert } from 'assert';
import {
  isTelemetryAllowed,
  getTelemetryStatus,
} from './telemetry';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.error(`  ✗ ${name}\n    ${(err as Error).message}`); }
}

console.log('\nPhase 1.2 — Telemetry Control Tests\n');

// Suite A: Default state (no env vars)
console.log('Suite A: Defaults\n');
delete process.env.NO_TELEMETRY;
delete process.env.ENABLE_AI;

test('License validation is always allowed', () => {
  assert.equal(isTelemetryAllowed('license_validation'), true);
});

test('License activation is always allowed', () => {
  assert.equal(isTelemetryAllowed('license_activation'), true);
});

test('License renewal is always allowed', () => {
  assert.equal(isTelemetryAllowed('license_renewal'), true);
});

test('AI drafting is blocked by default', () => {
  assert.equal(isTelemetryAllowed('ai_drafting'), false);
});

test('Threat intel is blocked by default', () => {
  assert.equal(isTelemetryAllowed('threat_intel'), false);
});

// Suite B: NO_TELEMETRY=true blocks all optional
console.log('\nSuite B: NO_TELEMETRY=true\n');
process.env.NO_TELEMETRY = 'true';

test('License still allowed when NO_TELEMETRY', () => {
  assert.equal(isTelemetryAllowed('license_validation'), true);
});

test('AI is blocked when NO_TELEMETRY', () => {
  assert.equal(isTelemetryAllowed('ai_drafting'), false);
});

test('Email outbound is blocked when NO_TELEMETRY', () => {
  assert.equal(isTelemetryAllowed('email_outbound'), false);
});

test('Analytics are blocked when NO_TELEMETRY', () => {
  assert.equal(isTelemetryAllowed('analytics'), false);
});

// Suite C: ENABLE_AI=true with NO_TELEMETRY=false
console.log('\nSuite C: ENABLE_AI=true\n');
process.env.NO_TELEMETRY = 'false';
process.env.ENABLE_AI = 'true';

test('AI drafting allowed when ENABLE_AI=true', () => {
  assert.equal(isTelemetryAllowed('ai_drafting'), true);
});

test('AI risk triage allowed when ENABLE_AI=true', () => {
  assert.equal(isTelemetryAllowed('ai_risk_triage'), true);
});

test('AI evidence analysis allowed when ENABLE_AI=true', () => {
  assert.equal(isTelemetryAllowed('ai_evidence_analysis'), true);
});

test('Analytics still blocked (no ENABLE_ANALYTICS)', () => {
  assert.equal(isTelemetryAllowed('analytics'), false);
});

// Suite D : ENABLE_THREAT_SCHEDULER
console.log('\nSuite D: ENABLE_THREAT_SCHEDULER\n');
delete process.env.ENABLE_AI;
process.env.ENABLE_THREAT_SCHEDULER = 'true';

test('Threat intel allowed when ENABLE_THREAT_SCHEDULER=true', () => {
  assert.equal(isTelemetryAllowed('threat_intel'), true);
});

test('AI still blocked (ENABLE_AI not set)', () => {
  assert.equal(isTelemetryAllowed('ai_drafting'), false);
});

// Suite E: getTelemetryStatus
console.log('\nSuite E: Status Report\n');
test('getTelemetryStatus returns all features', () => {
  const status = getTelemetryStatus();
  assert.ok(status.license_validation === true);
  assert.ok(status.license_activation === true);
  assert.ok(typeof status.ai_drafting === 'boolean');
  const keys = Object.keys(status);
  assert.ok(keys.length >= 10, `Expected 10+ features, got ${keys.length}`);
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
