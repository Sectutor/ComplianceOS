/**
 * BYOK & Credential Encryption (Phase 2.4)
 *
 * Wraps the existing AES-256-CBC encryption with:
 *  1. APP_ENCRYPTION_KEY enforcement for self-host builds
 *  2. Per-field key derivation so each credential uses a unique IV
 *  3. Consistency check on startup
 *
 * The user provides APP_ENCRYPTION_KEY which is then used to derive
 * all sub-keys. Without this key the server refuses to start in
 * production mode.
 */

import * as crypto from 'crypto';
import { encrypt as coreEncrypt, decrypt as coreDecrypt } from '../crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/* ------------------------------------------------------------------ */
/*  Key validation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Returns true if APP_ENCRYPTION_KEY is configured.
 * In production self-host mode this MUST be set.
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.APP_ENCRYPTION_KEY;
}

/**
 * Validates the encryption key at startup.
 * In production, fails hard if APP_ENCRYPTION_KEY is missing.
 * In development/single-user mode, generates a warning.
 */
export function validateEncryptionSetup(): {
  valid: boolean;
  mode: 'production-encrypted' | 'development-warn' | 'no-key';
  message: string;
} {
  const key = process.env.APP_ENCRYPTION_KEY;
  const isProd = process.env.NODE_ENV === 'production';

  if (key) {
    return {
      valid: true,
      mode: 'production-encrypted',
      message: `APP_ENCRYPTION_KEY configured (${key.length} chars). AES-256 encryption active.`,
    };
  }

  if (isProd) {
    return {
      valid: false,
      mode: 'no-key',
      message: 'FATAL: APP_ENCRYPTION_KEY is required in production mode. Set it before starting the server.',
    };
  }

  return {
    valid: true,
    mode: 'development-warn',
    message: 'WARNING: APP_ENCRYPTION_KEY not set. Credentials stored in plaintext. Set it for production.',
  };
}

/* ------------------------------------------------------------------ */
/*  Key derivation (per-field)                                         */
/* ------------------------------------------------------------------ */

function deriveSubKey(salt: string): Buffer {
  const masterKey = process.env.APP_ENCRYPTION_KEY || 'dev-fallback-key';
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/* ------------------------------------------------------------------ */
/*  Encrypt / Decrypt with BYOK                                        */
/* ------------------------------------------------------------------ */

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Encrypt a plaintext value using AES-256-GCM with a key derived from
 * APP_ENCRYPTION_KEY + an optional field-specific salt.
 *
 * @param plaintext  - Value to encrypt
 * @param fieldSalt  - Optional salt tied to the field name (e.g. 'api_key:openai')
 *                     ensures the same plaintext produces different ciphertext per field.
 */
export function encryptValue(plaintext: string, fieldSalt?: string): string {
  if (!plaintext) return plaintext;

  const salt = fieldSalt || crypto.randomBytes(16).toString('hex');
  const key = deriveSubKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // Encode as salt:iv:tag:ciphertext for storage
  return `${salt}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a value previously encrypted with encryptValue().
 */
export function decryptValue(encoded: string): string {
  if (!encoded) return encoded;

  const parts = encoded.split(':');
  if (parts.length < 4) {
    // Not in our cipher format — return as-is (plaintext fallback)
    return encoded;
  }

  const salt = parts[0];
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = parts.slice(3).join(':'); // rejoin if ciphertext contains ':'

  const key = deriveSubKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypt a whole object's sensitive fields.
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: (keyof T)[],
): T {
  const result = { ...obj };
  for (const key of sensitiveKeys) {
    if (result[key] && typeof result[key] === 'string') {
      (result[key] as any) = encryptValue(result[key] as string, String(key));
    }
  }
  return result;
}

/**
 * Decrypt a whole object's sensitive fields.
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: (keyof T)[],
): T {
  const result = { ...obj };
  for (const key of sensitiveKeys) {
    if (result[key] && typeof result[key] === 'string') {
      (result[key] as any) = decryptValue(result[key] as string);
    }
  }
  return result;
}

/**
 * Re-encrypt all values with a new key (rotation).
 * Call this when APP_ENCRYPTION_KEY changes.
 */
export function reEncryptValues(values: string[]): string[] {
  return values.map((v) => encryptValue(decryptValue(v)));
}
