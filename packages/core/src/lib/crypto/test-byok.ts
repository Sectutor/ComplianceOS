/**
 * Test script for BYOK encryption (Phase 2.4)
 *
 * Run: npx tsx packages/core/src/lib/crypto/test-byok.ts
 */

import { strict as assert } from 'assert';
import {
  encryptValue,
  decryptValue,
  validateEncryptionSetup,
  encryptSensitiveFields,
  decryptSensitiveFields,
} from './byok';

// Set a test key
process.env.APP_ENCRYPTION_KEY = 'test-master-key-that-is-long-enough-for-security';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.error(`  ✗ ${name}\n    ${(err as Error).message}`); }
}

console.log('\nPhase 2.4 — BYOK Encryption Tests\n');

console.log('Suite A: Encryption/Decryption Round-trip\n');
test('Encrypt and decrypt a simple string', () => {
  const encrypted = encryptValue('my-api-key-12345');
  assert.notEqual(encrypted, 'my-api-key-12345');
  assert.ok(encrypted.includes(':')); // salt:iv:tag:ciphertext format

  const decrypted = decryptValue(encrypted);
  assert.equal(decrypted, 'my-api-key-12345');
});

test('Encrypt with field-specific salt', () => {
  const a = encryptValue('sk-xxx', 'openai');
  const b = encryptValue('sk-xxx', 'openai');
  // Same field salt + same plaintext should produce different output (random IV)
  assert.notEqual(a, b);

  assert.equal(decryptValue(a), 'sk-xxx');
  assert.equal(decryptValue(b), 'sk-xxx');
});

test('Plaintext passthrough for unencrypted values', () => {
  assert.equal(decryptValue('hello'), 'hello');
  assert.equal(decryptValue(''), '');
  assert.equal(decryptValue('plain:value'), 'plain:value');
});

test('Empty string passthrough', () => {
  assert.equal(encryptValue(''), '');
});

console.log('\nSuite B: Object Field Encryption\n');
test('Encrypt sensitive fields in an object', () => {
  const obj = {
    name: 'My Integration',
    apiKey: 'sk-real-key-123',
    url: 'https://api.example.com',
    secretToken: 'super-secret',
  };

  const encrypted = encryptSensitiveFields(obj, ['apiKey', 'secretToken']);
  assert.notEqual(encrypted.apiKey, 'sk-real-key-123');
  assert.notEqual(encrypted.secretToken, 'super-secret');
  assert.equal(encrypted.name, 'My Integration'); // not encrypted
  assert.equal(encrypted.url, 'https://api.example.com'); // not encrypted

  const decrypted = decryptSensitiveFields(encrypted, ['apiKey', 'secretToken']);
  assert.equal(decrypted.apiKey, 'sk-real-key-123');
  assert.equal(decrypted.secretToken, 'super-secret');
});

console.log('\nSuite C: Configuration Validation\n');
test('Detects configured encryption key', () => {
  const result = validateEncryptionSetup();
  assert.equal(result.mode, 'production-encrypted'); // NODE_ENV not 'production'
  assert.ok(result.valid);
});

test('Fails hard when key missing in production', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.APP_ENCRYPTION_KEY;
  const result = validateEncryptionSetup();
  assert.equal(result.valid, false);
  assert.ok(result.message.includes('FATAL'));
  process.env.NODE_ENV = 'test';
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);
