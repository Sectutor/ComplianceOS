import { describe, it, expect, beforeEach, vi } from "vitest";
import { VfsMemoryEngine } from "../memory/vfsMemoryEngine";

describe("VfsMemoryEngine — Unit & Integration Test Suite", () => {
  let engine: VfsMemoryEngine;

  beforeEach(() => {
    engine = new VfsMemoryEngine();
    // Mock ensureTables to avoid DB connectivity hangs in test environment
    vi.spyOn(engine, "ensureTables").mockResolvedValue(undefined);
  });

  describe("Path Normalization & Parent Path Derivation", () => {
    it("normalizes paths cleanly with leading slash and no trailing slash", () => {
      expect(engine.normalizePath("company/infrastructure")).toBe("/company/infrastructure");
      expect(engine.normalizePath("/policies/soc2/")).toBe("/policies/soc2");
      expect(engine.normalizePath("   /facts\\learned/   ")).toBe("/facts/learned");
      expect(engine.normalizePath("/")).toBe("/");
      expect(engine.normalizePath("")).toBe("/");
    });

    it("derives parent directory paths correctly", () => {
      expect(engine.getParentPath("/")).toBe("/");
      expect(engine.getParentPath("/company")).toBe("/");
      expect(engine.getParentPath("/infrastructure/aws/production")).toBe("/infrastructure/aws");
      expect(engine.getParentPath("/policies/soc2/cc6.md")).toBe("/policies/soc2");
    });
  });

  describe("L0 Summary Generator (Token Optimizer)", () => {
    it("generates compact summaries without markdown noise", () => {
      const markdown = `
# AWS Production Configuration
We have deployed an Amazon EKS cluster with Karpenter autoscaling.
\`\`\`hcl
resource "aws_eks_cluster" "prod" {}
\`\`\`
All S3 buckets enforce SSE-KMS encryption with customer managed keys.
      `;
      const summary = engine.generateL0Summary(markdown, "AWS Baseline");
      expect(summary).toContain("AWS Production Configuration");
      expect(summary).toContain("[Code/Snippet]");
      expect(summary.length).toBeLessThanOrEqual(220);
    });

    it("falls back gracefully when content is empty", () => {
      const summary = engine.generateL0Summary("", "Kubernetes Spec");
      expect(summary).toBe("Kubernetes Spec entry.");
    });
  });

  describe("Mem0-Style Adaptive Fact Extraction", () => {
    it("extracts atomic facts from text and ignores conversational noise", async () => {
      const mockWrite = vi.spyOn(engine, "writeNode").mockResolvedValue({
        id: 1,
        clientId: 1,
        path: "/facts/test",
        parentPath: "/facts",
        nodeType: "fact",
        title: "Fact",
        summaryL0: "Fact",
        contentL2: "Fact",
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const notes = `
Hello team! Here is our weekly sync.
- We use AWS RDS in us-east-1 for our primary PostgreSQL databases.
- Okta WebAuthn MFA is enforced for all engineering staff.
- Snowflake is hosted in AWS for customer analytics.
Thanks everyone!
      `;

      const result = await engine.extractAndSaveFacts(1, notes, "team_sync");

      expect(result.savedCount).toBeGreaterThanOrEqual(2);
      expect(result.facts.some(f => f.includes("AWS RDS"))).toBe(true);
      expect(result.facts.some(f => f.includes("Okta WebAuthn MFA"))).toBe(true);
      expect(mockWrite).toHaveBeenCalled();
    });

    it("handles short or empty text safely without crashing", async () => {
      const result = await engine.extractAndSaveFacts(1, "Hi", "chat");
      expect(result.savedCount).toBe(0);
      expect(result.facts).toEqual([]);
    });
  });

  describe("Web & Regulatory Intelligence Ingestion", () => {
    it("ingests and categorizes regulatory web notes", async () => {
      const mockWrite = vi.spyOn(engine, "writeNode").mockResolvedValue({
        id: 42,
        clientId: 1,
        path: "/intel/regulations/nist_gov_sp_800_53",
        parentPath: "/intel/regulations",
        nodeType: "web_intel",
        title: "NIST SP 800-53 Rev. 5 Update",
        summaryL0: "NIST Cryptographic standard update",
        contentL2: "Full text clauses...",
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const node = await engine.ingestWebIntel(1, {
        url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
        title: "NIST SP 800-53 Rev. 5 Update",
        content: "Detailed clauses on SC-13 Cryptographic Protection and AC-2 Account Management.",
        category: "regulations",
        frameworks: ["NIST SP 800-53", "FedRAMP High"],
      });

      expect(mockWrite).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          nodeType: "web_intel",
          title: "NIST SP 800-53 Rev. 5 Update",
        })
      );
      expect(node.id).toBe(42);
    });
  });
});
