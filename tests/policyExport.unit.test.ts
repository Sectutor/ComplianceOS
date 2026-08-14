import { describe, it, expect } from "vitest";
import { generatePolicyDocx, generatePolicyHtml } from "../policyExport";

const samplePolicy = {
  name: "Acceptable Use Policy",
  content: [
    "# Overview",
    "",
    "This policy applies to **all employees**.",
    "",
    "## Scope",
    "- Internal systems",
    "- External systems",
    "",
    "### Review",
    "Annual review required.",
  ].join("\n"),
  version: 2,
  clientName: "Acme Corp",
  status: "draft",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("policyExport unit tests", () => {
  describe("generatePolicyHtml", () => {
    it("renders title, client name and capitalized status", () => {
      const html = generatePolicyHtml(samplePolicy);
      expect(html).toContain('<div class="title">Acceptable Use Policy</div>');
      expect(html).toContain('<div class="client-name">Acme Corp</div>');
      expect(html).toContain("Version: 2 | Status: Draft");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("converts markdown headings, bold and bullet lists to HTML", () => {
      const html = generatePolicyHtml(samplePolicy);
      expect(html).toContain("<h1>Overview</h1>");
      expect(html).toContain("<h2>Scope</h2>");
      expect(html).toContain("<h3>Review</h3>");
      expect(html).toContain("<strong>all employees</strong>");
      expect(html).toContain("<li>Internal systems</li>");
      expect(html).toContain("<ul>");
    });

    it("supports star-style bullets", () => {
      const html = generatePolicyHtml({
        ...samplePolicy,
        content: "* one\n* two\n\nplain paragraph",
      });
      expect(html).toContain("<li>one</li>");
      expect(html).toContain("<li>two</li>");
    });

    it("does not throw for empty status or zero version", () => {
      const html = generatePolicyHtml({ ...samplePolicy, status: "", version: 0 });
      expect(html).toContain("Version: 0 | Status: ");
    });
  });

  describe("generatePolicyDocx", () => {
    it("produces a non-empty docx (zip) buffer", async () => {
      const buf = await generatePolicyDocx(samplePolicy);
      expect(buf).toBeInstanceOf(Uint8Array);
      expect(buf.length).toBeGreaterThan(1000);
      const magic = new TextDecoder().decode(buf.slice(0, 2));
      expect(magic).toBe("PK");
    });

    it("accepts an explicit policyLanguage and still produces output", async () => {
      const buf = await generatePolicyDocx({ ...samplePolicy, policyLanguage: "de" });
      expect(buf.length).toBeGreaterThan(0);
    });

    it("handles markdown content with tables and numbered lists", async () => {
      const buf = await generatePolicyDocx({
        ...samplePolicy,
        content: "# Policy\n\n1. First item\n2. Second item\n\n| Col A | Col B |\n| --- | --- |\n",
      });
      expect(buf.length).toBeGreaterThan(1000);
    });
  });
});
