/**
 * Licensed License File Format (Phase 3.1-3.2)
 *
 * Self-contained license file format using Ed25519 signatures.
 * The license file is a signed JSON document that the ComplianceOS
 * instance validates locally (after an initial online activation check).
 *
 * Format:
 * {
 *   "licenseKey": "COM-XXXX-XXXX-XXXX",
 *   "tier": "community" | "pro" | "enterprise" | "trial",
 *   "issuedTo": "Customer Name",
 *   "issuedAt": "2026-01-01T00:00:00Z",
 *   "expiresAt": "2027-01-01T00:00:00Z",
 *   "maxUsers": 50,
 *   "maxClients": 10,
 *   "features": ["ai.drafting", "ai.risk_triage"],
 *   "signature": "base64-ed25519-sig"
 * }
 */

import { createPrivateKey, createPublicKey, sign, verify, generateKeyPairSync } from 'crypto';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LicenseTier = 'community' | 'pro' | 'enterprise' | 'trial';

export interface LicenseFile {
  licenseKey: string;
  tier: LicenseTier;
  issuedTo: string;
  issuedAt: string;   // ISO date
  expiresAt: string;  // ISO date
  maxUsers: number;
  maxClients: number;
  features: string[];
  signature: string;  // base64-encoded Ed25519 signature
}

export interface LicenseFileValidationResult {
  valid: boolean;
  license?: Omit<LicenseFile, 'signature'>;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Ed25519 key management (self-contained, uses Node crypto)          */
/* ------------------------------------------------------------------ */

/**
 * Generate a new Ed25519 keypair for license signing.
 * The private key should be kept secure on the license server.
 * The public key is embedded in the ComplianceOS binary.
 */
export function generateLicenseKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/**
 * Default public key (embedded in the self-host build).
 * In production, replace this with your license server's public key.
 */
const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
-----END PUBLIC KEY-----`;

function getPublicKey(): string {
  return process.env.LICENSE_PUBLIC_KEY || DEFAULT_PUBLIC_KEY;
}

/* ------------------------------------------------------------------ */
/*  Signing and verification                                           */
/* ------------------------------------------------------------------ */

function canonicalLicense(data: Omit<LicenseFile, 'signature'>): string {
  return `${data.licenseKey}|${data.tier}|${data.issuedTo}|${data.issuedAt}|${data.expiresAt}|${data.maxUsers}|${data.maxClients}|${data.features.sort().join(',')}`;
}

/**
 * Sign a license file payload with the private key.
 * Called by the license server when issuing a license.
 */
export function signLicense(
  data: Omit<LicenseFile, 'signature'>,
  privateKeyPem: string,
): LicenseFile {
  const privateKey = createPrivateKey(privateKeyPem);
  const canonical = canonicalLicense(data);
  const sig = sign(null, Buffer.from(canonical, 'utf-8'), privateKey);
  return {
    ...data,
    signature: sig.toString('base64'),
  };
}

/**
 * Verify a license file's signature against the embedded public key.
 */
export function verifyLicenseSignature(license: LicenseFile): boolean {
  try {
    const publicKey = createPublicKey(getPublicKey());
    const { signature, ...data } = license;
    const canonical = canonicalLicense(data);
    return verify(
      null,
      Buffer.from(canonical, 'utf-8'),
      publicKey,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}

/**
 * Full validation: signature + expiry + feature set.
 */
export function validateLicenseFile(license: LicenseFile): LicenseFileValidationResult {
  // Check expiry
  const now = new Date();
  const expires = new Date(license.expiresAt);
  if (expires < now) {
    return { valid: false, error: `License expired on ${license.expiresAt}` };
  }

  // Check signature
  if (!verifyLicenseSignature(license)) {
    return { valid: false, error: 'License signature is invalid or tampered' };
  }

  const { signature, ...data } = license;
  return { valid: true, license: data };
}

/**
 * Parse a license file from its JSON string representation.
 */
export function parseLicenseFile(json: string): LicenseFile | null {
  try {
    const data = JSON.parse(json);
    if (!data.licenseKey || !data.tier || !data.signature) return null;
    return data as LicenseFile;
  } catch {
    return null;
  }
}
