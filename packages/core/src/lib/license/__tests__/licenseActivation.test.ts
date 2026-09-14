import { describe, it, expect } from 'vitest';
import {
  generateLicenseKeyPair,
  signLicense,
  verifyLicenseSignature,
  validateLicenseFile,
  parseLicenseFile,
  type LicenseFile
} from '../license-file';
import { getSystemMachineFingerprint } from '../../../server/routers/licenseActivation';

describe('Cryptographic License Security & Anti-Tamper Verification', () => {
  it('generates a deterministic 32-char hex machine fingerprint', () => {
    const fp1 = getSystemMachineFingerprint();
    const fp2 = getSystemMachineFingerprint();
    expect(fp1).toBeDefined();
    expect(fp1.length).toBe(32);
    expect(fp1).toBe(fp2);
  });

  it('signs and validates an authentic Ed25519 commercial license file', () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    process.env.LICENSE_PUBLIC_KEY = publicKey;

    const licenseData = {
      licenseKey: 'COMP-ENT-2026-TEST-KEY',
      tier: 'enterprise' as const,
      issuedTo: 'Acme Federal Systems',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsers: 500,
      maxClients: 9999,
      features: ['federal', 'threat_intel', 'ai_copilot', 'msp_multi_tenant'],
    };

    const signedLicense = signLicense(licenseData, privateKey);
    expect(signedLicense.signature).toBeDefined();

    const isSignatureValid = verifyLicenseSignature(signedLicense);
    expect(isSignatureValid).toBe(true);

    const validation = validateLicenseFile(signedLicense);
    expect(validation.valid).toBe(true);
    expect(validation.license?.tier).toBe('enterprise');
    expect(validation.license?.maxClients).toBe(9999);
  });

  it('strictly rejects tampered license files (anti-bypass)', () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    process.env.LICENSE_PUBLIC_KEY = publicKey;

    const licenseData = {
      licenseKey: 'COMP-PRO-1234-5678',
      tier: 'pro' as const,
      issuedTo: 'Test User',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsers: 10,
      maxClients: 5,
      features: ['soc2', 'iso27001'],
    };

    const signedLicense = signLicense(licenseData, privateKey);

    const tamperedLicense: LicenseFile = {
      ...signedLicense,
      maxClients: 9999,
      tier: 'enterprise',
    };

    const isSignatureValid = verifyLicenseSignature(tamperedLicense);
    expect(isSignatureValid).toBe(false);

    const validation = validateLicenseFile(tamperedLicense);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('invalid or tampered');
  });

  it('rejects expired license files', () => {
    const { publicKey, privateKey } = generateLicenseKeyPair();
    process.env.LICENSE_PUBLIC_KEY = publicKey;

    const expiredLicenseData = {
      licenseKey: 'COMP-ENT-EXPIRED',
      tier: 'enterprise' as const,
      issuedTo: 'Expired Corp',
      issuedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2021-01-01T00:00:00.000Z',
      maxUsers: 50,
      maxClients: 10,
      features: ['federal'],
    };

    const signedLicense = signLicense(expiredLicenseData, privateKey);
    const validation = validateLicenseFile(signedLicense);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('expired');
  });

  it('parses valid and invalid JSON license payloads', () => {
    expect(parseLicenseFile('not-json')).toBeNull();
    expect(parseLicenseFile('{}')).toBeNull();

    const validJson = JSON.stringify({
      licenseKey: 'COMP-ENT-999',
      tier: 'enterprise',
      signature: 'valid-mock-sig'
    });
    expect(parseLicenseFile(validJson)).not.toBeNull();
  });
});
