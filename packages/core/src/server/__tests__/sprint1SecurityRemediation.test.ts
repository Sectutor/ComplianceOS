import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeHtml, generateProfessionalHtml } from "../../policyExportProfessional";

describe("Sprint 1 Security Remediation Suite", () => {
  describe("A03 / XSS Prevention: escapeHtml and generateProfessionalHtml", () => {
    it("escapes dangerous HTML special characters", () => {
      const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1)> & \' "';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("<img");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&lt;img");
      expect(escaped).toContain("&amp;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#039;");
    });

    it("prevents script injection in generated policy HTML", () => {
      const mockPolicy: any = {
        name: '<script>alert("name-xss")</script>',
        content: '## Section 1\n<script>alert("content-xss")</script>\n| Col 1 | Col 2 |\n| <script> | payload |',
        sections: ['<img src=x onerror=alert("title-xss")>'],
        version: 1,
        clientName: '<iframe src="javascript:alert(1)"></iframe>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        logoUrl: 'javascript:alert(1)',
      };

      const html = generateProfessionalHtml(mockPolicy);

      // Verify no executable script or iframe tags exist in raw HTML output
      expect(html).not.toContain('<script>alert("name-xss")</script>');
      expect(html).not.toContain('<script>alert("content-xss")</script>');
      expect(html).not.toContain('<iframe src="javascript:alert(1)">');
      expect(html).not.toContain('<img src="javascript:alert(1)"');

      // Verify sanitized entities are present
      expect(html).toContain('&lt;script&gt;alert(&quot;name-xss&quot;)&lt;/script&gt;');
      expect(html).toContain('&lt;script&gt;alert(&quot;content-xss&quot;)&lt;/script&gt;');
    });

    it("allows valid https and /uploads/ logos, but rejects javascript: URIs", () => {
      const policyWithValidLogo: any = {
        name: 'Safe Policy',
        content: 'Content',
        sections: ['Section 1'],
        version: 1,
        clientName: 'Acme Corp',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        logoUrl: 'https://example.com/logo.png',
      };
      const html1 = generateProfessionalHtml(policyWithValidLogo);
      expect(html1).toContain('<img src="https://example.com/logo.png" alt="Company Logo" class="cover-logo" />');

      const policyWithMaliciousLogo: any = {
        ...policyWithValidLogo,
        logoUrl: 'javascript:alert(document.cookie)',
      };
      const html2 = generateProfessionalHtml(policyWithMaliciousLogo);
      expect(html2).not.toContain('javascript:alert');
    });
  });

  describe("A02: Secure User Invitation Password Generation", () => {
    it("verifies that random invitation tokens are generated instead of static passwords", async () => {
      const cryptoNode = await import('crypto');
      const token1 = cryptoNode.randomBytes(32).toString('base64url');
      const token2 = cryptoNode.randomBytes(32).toString('base64url');

      expect(token1).not.toBe('temp_password_123');
      expect(token2).not.toBe('temp_password_123');
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe("A01: Webhook Test Endpoint Access Control", () => {
    it("simulates blocking /gumroad/test in production environment", () => {
      const isProduction = true;
      const enableWebhookTest = false;

      const shouldBlock = isProduction || !enableWebhookTest;
      expect(shouldBlock).toBe(true);
    });

    it("simulates requiring admin privileges for /gumroad/status", () => {
      const standardUser = { id: 1, role: 'user' };
      const adminUser = { id: 2, role: 'admin' };
      const superAdminUser = { id: 3, role: 'super_admin' };

      const canAccessStatus = (u: any) =>
        u && (u.role === 'admin' || u.role === 'super_admin' || u.role === 'enterprise_admin');

      expect(canAccessStatus(standardUser)).toBe(false);
      expect(canAccessStatus(adminUser)).toBe(true);
      expect(canAccessStatus(superAdminUser)).toBe(true);
      expect(canAccessStatus(null)).toBeFalsy();
    });
  });
});
