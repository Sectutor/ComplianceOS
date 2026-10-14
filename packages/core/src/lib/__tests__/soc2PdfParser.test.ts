import { describe, it, expect, vi } from "vitest";

// Force the heuristic fallback: make the LLM call fail deterministically.
vi.mock("../llm/service", () => ({
  LLMService: class {
    async generate(): Promise<never> {
      throw new Error("LLM unavailable in tests");
    }
  },
}));

import { evaluateVendorSoc2Report, EXCEPTIONS_MANUAL_REVIEW } from "../vendor/soc2PdfParser";

describe("evaluateVendorSoc2Report", () => {
  it("should parse clean unqualified SOC 2 report with heuristic fallback", async () => {
    const sampleText = `
      INDEPENDENT SERVICE AUDITOR'S REPORT
      To the Management of Acme Cloud Inc.:
      Scope: We have examined Acme Cloud Inc.'s description of its Cloud Platform system for the period January 1, 2025 to December 31, 2025.
      Service Auditor: Schellman & Company, LLC.
      Criteria: Security, Availability, and Confidentiality.
      Opinion: In our opinion, in all material respects, the description presents fairly and the controls were suitably designed and operated effectively.
      Complementary User Entity Controls:
      - Users must enable multi-factor authentication (MFA) for administrative access.
      - Users are responsible for configuring TLS 1.3 encryption.
      Section IV: Test Results: No exceptions noted during sample testing.
    `;

    const result = await evaluateVendorSoc2Report(sampleText, "Acme Cloud");
    expect(result).toBeDefined();
    expect(result.vendorName).toBe("Acme Cloud");
    expect(result.opinion).toBe("Unqualified (Clean)");
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.exceptionsIdentified).toEqual([]);
    expect(result.structuredExceptions).toEqual([]);
    expect(result.cuecsRequired).toEqual([
      "Users must enable multi-factor authentication (MFA) for administrative access.",
      "Users are responsible for configuring TLS 1.3 encryption.",
    ]);
    expect(result.structuredCuecs?.map((c) => c.requirement)).toEqual(result.cuecsRequired);
    expect(result.auditorFirm).toBe("Schellman & Company, LLC");
    expect(result.trustServicesCriteria).toEqual(["Security (Common Criteria)", "Availability", "Confidentiality"]);
    expect(result.summary).toMatch(/heuristic, low-confidence/i);
  });

  it("should detect qualified opinion and exceptions", async () => {
    const qualifiedText = `
      INDEPENDENT AUDITOR'S REPORT
      Auditor: A-LIGN CPAs.
      Qualified Opinion: In our opinion, except for the matter described in the Basis for Qualified Opinion section, the controls operated effectively.
      Exception noted: 4 out of 25 terminated users were not deactivated within the 24-hour SLA.
    `;

    const result = await evaluateVendorSoc2Report(qualifiedText, "Beta Systems");
    expect(result).toBeDefined();
    expect(result.opinion).toBe("Qualified");
    expect(result.riskScore).toBeLessThan(95);
  });

  it("does not invent a CC6.3 exception or remediation note", async () => {
    const text = `
      SOC 2 Type II report prepared by A-LIGN CPAs for the period March 1, 2025 to February 28, 2026.
      Control CC7.2: Exception noted. Two of 40 sampled alerts were not triaged within the documented 24-hour window.
    `;
    const result = await evaluateVendorSoc2Report(text, "Gamma Inc");
    const all = JSON.stringify(result);
    expect(all).not.toContain("CC6.3");
    expect(all).not.toMatch(/ticketing integration/i);
    expect(result.structuredExceptions?.every((e) => e.remediationNotes === undefined)).toBe(true);
    expect(result.reportType).toBe("SOC 2 Type II");
  });

  it("extracts the actual exception sentence with its control ID", async () => {
    const text = `
      Independent service auditor's report (SOC 2 Type I) issued by Moss Adams LLP.
      CC8.1 - Exception noted: 3 of 25 sampled production changes lacked documented approval prior to deployment.
      CC6.1 - No exceptions noted.
    `;
    const result = await evaluateVendorSoc2Report(text, "Delta Co");
    expect(result.structuredExceptions).toHaveLength(1);
    expect(result.structuredExceptions?.[0]).toMatchObject({
      controlId: "CC8.1",
      severity: "medium",
      description: expect.stringContaining("3 of 25 sampled production changes lacked documented approval"),
    });
    expect(result.exceptionsIdentified[0]).toContain("CC8.1");
    expect(result.reportType).toBe("SOC 2 Type I");
  });

  it("falls back to a manual-review message when exceptions are indicated but not extractable", async () => {
    // The phrase is split across a line break, so no single sentence contains it.
    const text = `
      Results of testing for the period January 1, 2025 to December 31, 2025: certain exceptions
      were noted for logical access controls, as described in Section IV of the report.
    `;
    const result = await evaluateVendorSoc2Report(text, "Epsilon");
    expect(result.exceptionsIdentified).toEqual([EXCEPTIONS_MANUAL_REVIEW]);
    expect(result.structuredExceptions).toEqual([]);
  });

  it("returns empty CUECs and flags manual review when no CUEC section exists", async () => {
    const text = `
      SOC 2 Type II examination. In our opinion, the controls were suitably designed and operated effectively.
      Test results: No exceptions noted. This report is intended solely for the information of the user entities.
    `;
    const result = await evaluateVendorSoc2Report(text, "Zeta");
    expect(result.cuecsRequired).toEqual([]);
    expect(result.structuredCuecs).toEqual([]);
    expect(result.summary).toMatch(/CUECs need manual review/i);
  });

  it("does not treat 'ey' inside other words as Ernst & Young, nor bare 'security' as a TSC", async () => {
    const text = `
      The survey of key security keys was conducted yearly. They reviewed privacy notices in the employee handbook.
      In our opinion, the description presents fairly the system.
    `;
    const result = await evaluateVendorSoc2Report(text, "Eta");
    expect(result.auditorFirm).not.toMatch(/Ernst/);
    expect(result.trustServicesCriteria).toEqual([]);
  });

  it("returns Undetermined instead of Clean when no opinion is found", async () => {
    const text = `
      Management's description of the system. This document outlines the controls in place at Theta Ltd.
      It includes sections about change management and access control procedures.
    `;
    const result = await evaluateVendorSoc2Report(text, "Theta");
    expect(result.opinion).toBe("Undetermined");
    expect(result.riskScore).toBeLessThan(70);
    expect(result.recommendedAction).toMatch(/manual review/i);
  });
});
