import crypto from 'crypto';
import { getEncryptionKeys, getActiveKeyVersion } from './secrets';

const GCM_ALGORITHM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12; // 96-bit IV recommended by NIST for AES-GCM
const CBC_ALGORITHM = 'aes-256-cbc';
const LEGACY_IV_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from a secret string using SHA-256 binary digest
 */
function deriveKey(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Legacy key derivation used by prior CBC implementation
 */
function deriveLegacyKey(secret: string): Buffer {
    const hash = crypto.createHash('sha256').update(secret).digest('base64').substring(0, 32);
    return Buffer.from(hash);
}

/**
 * Encrypts data using authenticated AES-256-GCM (ASVS V14.1.2 / OWASP A02 Defense)
 */
export function encrypt(text: string): string {
    if (!text) return text;

    const keys = getEncryptionKeys();
    const activeVersion = getActiveKeyVersion();
    const activeKey = keys[activeVersion];

    if (!activeKey) {
        throw new Error(`Encryption failed: Active key version ${activeVersion} not found`);
    }

    const key = deriveKey(activeKey);
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: version$iv:authTag:ciphertext
    return `${activeVersion}$${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts data using authenticated AES-256-GCM, with backward-compatibility for legacy AES-256-CBC
 */
export function decrypt(text: string): string {
    if (!text) return text;

    try {
        let version = 'v1'; // Default / Legacy version
        let rawData = text;

        if (text.includes('$')) {
            const parts = text.split('$');
            version = parts[0];
            rawData = parts[1];
        }

        const keys = getEncryptionKeys();
        const keyString = keys[version];

        if (!keyString) {
            console.warn(`Decryption warning: Key version ${version} not found. Data might be unreadable.`);
            return text; // Return as is if we can't find the key
        }

        const textParts = rawData.split(':');

        // Case 1: Authenticated AES-256-GCM (3 parts: iv, authTag, ciphertext)
        if (textParts.length === 3) {
            const iv = Buffer.from(textParts[0], 'hex');
            const authTag = Buffer.from(textParts[1], 'hex');
            const encryptedText = Buffer.from(textParts[2], 'hex');
            const key = deriveKey(keyString);

            const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString('utf8');
        }

        // Case 2: Legacy AES-256-CBC (2 parts: iv, ciphertext)
        if (textParts.length === 2) {
            const iv = Buffer.from(textParts[0], 'hex');
            const encryptedText = Buffer.from(textParts[1], 'hex');
            const key = deriveLegacyKey(keyString);

            const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString('utf8');
        }

        return text;
    } catch (error) {
        console.error("Decryption failed (integrity or key mismatch):", error);
        throw new Error("Decryption failed: data may be corrupted or tampered with");
    }
}
