/**
 * Test script for Local Auth (Phase 2.3)
 *
 * Run: npx tsx src/lib/auth/test-local-auth.ts
 */

import { strict as assert } from 'assert';
import { rmSync } from 'fs';
import { localAuth } from './local-auth';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.error(`  ✗ ${name}\n    ${(err as Error).message}`); }
}

// Set temp dir so test doesn't clobber real data
process.env.COMPLIANCEOS_DATA_DIR = '/tmp/.test-local-auth';

console.log('\nPhase 2.3 — Local Auth Tests\n');

// Clean state
try { rmSync('/tmp/.test-local-auth/local-users.json', { force: true }); } catch {}

// Suite A: Registration
console.log('Suite A: Registration\n');
test('Register a new user', () => {
  const result = localAuth.register('alice@test.com', 'password123', 'Alice');
  assert.equal(result.success, true);
  assert.ok(result.token);
  assert.equal(result.user!.email, 'alice@test.com');
});

test('Block duplicate email', () => {
  const result = localAuth.register('alice@test.com', 'other');
  assert.equal(result.success, false);
  assert.ok(result.error!.includes('already registered'));
});

// Suite B: Login
console.log('\nSuite B: Login\n');
test('Login with valid credentials', () => {
  const result = localAuth.login('alice@test.com', 'password123');
  assert.equal(result.success, true);
  assert.ok(result.token);
});

test('Reject wrong password', () => {
  const result = localAuth.login('alice@test.com', 'wrong');
  assert.equal(result.success, false);
  assert.equal(result.error, 'Invalid email or password');
});

test('Reject unknown email', () => {
  const result = localAuth.login('unknown@test.com', 'any');
  assert.equal(result.success, false);
  assert.equal(result.error, 'Invalid email or password');
});

// Suite C: Token validation
console.log('\nSuite C: Token Validation\n');
test('Issue and verify token', () => {
  const login = localAuth.login('alice@test.com', 'password123');
  assert.ok(login.token);

  const decoded = localAuth.validateToken(login.token!);
  assert.ok(decoded);
  assert.equal(decoded!.email, 'alice@test.com');
});

test('Reject tampered token', () => {
  const login = localAuth.login('alice@test.com', 'password123');
  const parts = login.token!.split('.');
  parts[2] = 'deadbeef';
  const tampered = parts.join('.');

  const decoded = localAuth.validateToken(tampered);
  assert.equal(decoded, null);
});

test('Reject garbage token', () => {
  const decoded = localAuth.validateToken('not.a.token');
  assert.equal(decoded, null);
});

// Suite D: isLocalAuthActive
console.log('\nSuite D: Local Auth Detection\n');
test('Detects local auth active when Supabase has placeholder', () => {
  process.env.VITE_SUPABASE_URL = 'https://placeholder.supabase.co';
  assert.equal(localAuth.isLocalAuthActive(), true);
});

test('Detects local auth inactive when real Supabase URL', () => {
  process.env.VITE_SUPABASE_URL = 'https://real-project.supabase.co';
  assert.equal(localAuth.isLocalAuthActive(), false);
});

// Cleanup
try { rmSync('/tmp/.test-local-auth', { recursive: true, force: true }); } catch {}

console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);
