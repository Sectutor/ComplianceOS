import { describe, it, expect } from "vitest";
import { isPrivateIp, isSafeExternalUrl } from "../../lib/ai/vrm-agent";
import { encrypt, decrypt } from "../../lib/crypto";
import crypto from "crypto";

describe("Sprint 2 Security Remediation Suite", () => {
  describe("A10 / SSRF Defense: Private IP & External URL Validation", () => {
    it("identifies private and reserved IPv4 ranges", () => {
      expect(isPrivateIp("127.0.0.1")).toBe(true);
      expect(isPrivateIp("10.0.1.50")).toBe(true);
      expect(isPrivateIp("172.16.0.1")).toBe(true);
      expect(isPrivateIp("172.31.255.255")).toBe(true);
      expect(isPrivateIp("192.168.1.1")).toBe(true);
      expect(isPrivateIp("169.254.169.254")).toBe(true); // AWS/cloud metadata
      expect(isPrivateIp("0.0.0.0")).toBe(true);
      expect(isPrivateIp("100.64.0.1")).toBe(true); // CGNAT
    });

    it("identifies IPv6 loopback and link-local addresses", () => {
      expect(isPrivateIp("::1")).toBe(true);
      expect(isPrivateIp("fe80::1")).toBe(true);
      expect(isPrivateIp("fc00::1")).toBe(true);
    });

    it("allows public IPv4 addresses", () => {
      expect(isPrivateIp("8.8.8.8")).toBe(false);
      expect(isPrivateIp("1.1.1.1")).toBe(false);
      expect(isPrivateIp("93.184.216.34")).toBe(false); // example.com
    });

    it("blocks SSRF attempts on internal, cloud metadata, and invalid schemes", async () => {
      expect(await isSafeExternalUrl("http://localhost:3002/api/health")).toBe(false);
      expect(await isSafeExternalUrl("http://127.0.0.1:3000/")).toBe(false);
      expect(await isSafeExternalUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
      expect(await isSafeExternalUrl("http://10.0.0.1/admin")).toBe(false);
      expect(await isSafeExternalUrl("http://192.168.0.1/router")).toBe(false);
      expect(await isSafeExternalUrl("file:///etc/passwd")).toBe(false);
      expect(await isSafeExternalUrl("gopher://127.0.0.1:6379/")).toBe(false);
      expect(await isSafeExternalUrl("http://server.internal/")).toBe(false);
      expect(await isSafeExternalUrl("http://server.local/")).toBe(false);
    });

    it("allows valid public HTTPS endpoints and public IP URLs", async () => {
      expect(await isSafeExternalUrl("https://8.8.8.8/")).toBe(true);
      expect(await isSafeExternalUrl("https://1.1.1.1/dns-query")).toBe(true);
    });
  });

  describe("A02: Authenticated Field-Level Encryption (AES-256-GCM)", () => {
    it("encrypts data into 3-part GCM format (version$iv:authTag:ciphertext)", () => {
      const plaintext = "compliance-sensitive-token-12345";
      const encrypted = encrypt(plaintext);

      expect(encrypted).toContain("$");
      const parts = encrypted.split("$")[1].split(":");
      expect(parts.length).toBe(3); // iv, authTag, ciphertext
      expect(parts[0].length).toBe(24); // 12-byte IV in hex (24 chars)
      expect(parts[1].length).toBe(32); // 16-byte GCM auth tag in hex (32 chars)
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it("successfully decrypts authenticated GCM ciphertext", () => {
      const secretData = "API_KEY_SECRET_987654321";
      const encrypted = encrypt(secretData);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(secretData);
    });

    it("detects tampering and rejects modified ciphertext", () => {
      const secretData = "critical-configuration-value";
      const encrypted = encrypt(secretData);

      const [versionPart, dataPart] = encrypted.split("$");
      const [ivHex, tagHex, cipherHex] = dataPart.split(":");

      // Tamper with the last character of ciphertext
      const tamperedCipherHex = cipherHex.slice(0, -2) + (cipherHex.endsWith("00") ? "ff" : "00");
      const tamperedEncrypted = `${versionPart}$${ivHex}:${tagHex}:${tamperedCipherHex}`;

      // AES-GCM verification must fail on tampered data
      expect(() => decrypt(tamperedEncrypted)).toThrow(/Decryption failed/);
    });

    it("preserves backward compatibility with legacy AES-256-CBC ciphertext", () => {
      // Manually construct a legacy 2-part CBC ciphertext using legacy derivation
      const secret = "default-dev-key-must-be-32-bytes-long!";
      const legacyKeyHash = crypto.createHash('sha256').update(secret).digest('base64').substring(0, 32);
      const legacyKey = Buffer.from(legacyKeyHash);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", legacyKey, iv);
      const legacyPlaintext = "legacy-cbc-stored-value";
      let enc = cipher.update(legacyPlaintext, "utf8");
      enc = Buffer.concat([enc, cipher.final()]);

      const legacyFormat = `v1$${iv.toString("hex")}:${enc.toString("hex")}`;

      // Decrypt legacy format
      const decrypted = decrypt(legacyFormat);
      expect(decrypted).toBe(legacyPlaintext);
    });
  });

  describe("A05 / CORS Configuration: Strict Origin Matching", () => {
    it("validates that wildcards are removed and exact netlify subdomain is checked", () => {
      const allowedOrigins = ['http://localhost:5173'];
      const isAllowed = (origin: string) => {
        const isLocal = origin.startsWith('http://localhost:') ||
          origin === 'http://localhost' ||
          origin.startsWith('http://127.0.0.1:') ||
          origin === 'http://127.0.0.1';

        const isAllowedProd =
          allowedOrigins.indexOf(origin) !== -1 ||
          origin === 'https://grcompliance.netlify.app' ||
          origin === 'https://grcompliance.com' ||
          origin === 'https://www.grcompliance.com' ||
          origin === 'https://app.grcompliance.com' ||
          /^https:\/\/[a-z0-9-]+\.grcompliance\.com$/.test(origin);

        return isAllowedProd || isLocal;
      };

      // Allowed origins
      expect(isAllowed('https://grcompliance.netlify.app')).toBe(true);
      expect(isAllowed('https://app.grcompliance.com')).toBe(true);
      expect(isAllowed('https://staging.grcompliance.com')).toBe(true);
      expect(isAllowed('http://localhost:5173')).toBe(true);

      // Blocked malicious origins
      expect(isAllowed('https://attacker.netlify.app')).toBe(false);
      expect(isAllowed('https://fake-grcompliance.com')).toBe(false);
      expect(isAllowed('https://attacker.com/.grcompliance.com')).toBe(false);
    });
  });
});
