import { describe, it, expect } from "vitest";
import {
  calculateInherentScore,
  calculateResidualRisk,
  calculateResidualScore,
  getMatrixScoreLevel,
  getRiskLevelColor,
  getRiskLevelTextColor,
  getRiskScore,
  normalizeControlEffectiveness,
  parseLikelihoodImpact,
  scoreToRiskLevel,
  type RiskLevel,
} from "../riskCalculations";

describe("riskCalculations", () => {
  describe("normalizeControlEffectiveness", () => {
    const cases: Array<[string | null | undefined, string]> = [
      ["effective", "effective"],
      ["Effective", "effective"],
      ["EFFECTIVE", "effective"],
      ["partially_effective", "partially_effective"],
      ["Partially Effective", "partially_effective"],
      ["PARTIALLY-EFFECTIVE", "partially_effective"],
      ["ineffective", "ineffective"],
      ["Ineffective", "ineffective"],
      ["", ""],
      [undefined, ""],
      [null, ""],
      ["unknown", ""],
    ];

    it.each(cases)("normalizes %p to %p", (input, expected) => {
      const result = normalizeControlEffectiveness(input);
      expect(result).toBe(expected);
    });
  });

  describe("parseLikelihoodImpact", () => {
    it("returns 0 for empty or invalid values", () => {
      expect(parseLikelihoodImpact("")).toBe(0);
      expect(parseLikelihoodImpact(null)).toBe(0);
      expect(parseLikelihoodImpact(undefined)).toBe(0);
      expect(parseLikelihoodImpact("abc")).toBe(0);
    });

    it("parses numeric strings and clamps between 1 and 5", () => {
      expect(parseLikelihoodImpact("1")).toBe(1);
      expect(parseLikelihoodImpact(" 3 ")).toBe(3);
      expect(parseLikelihoodImpact(4)).toBe(4);
      expect(parseLikelihoodImpact(0)).toBe(1);
      expect(parseLikelihoodImpact(7)).toBe(5);
    });
  });

  describe("scoreToRiskLevel", () => {
    const cases: Array<[number, RiskLevel]> = [
      [0, "Low"],
      [1, "Low"],
      [2, "Medium"],
      [3, "High"],
      [4, "Very High"],
      [5, "Critical"],
      [10, "Critical"],
    ];

    it.each(cases)("maps score %p to %p", (score, expected) => {
      expect(scoreToRiskLevel(score)).toBe(expected);
    });
  });

  describe("getMatrixScoreLevel", () => {
    const cases: Array<[number, RiskLevel]> = [
      [1, "Low"],
      [3, "Low"],
      [4, "Medium"],
      [8, "Medium"],
      [9, "High"],
      [14, "High"],
      [15, "Very High"],
      [19, "Very High"],
      [20, "Critical"],
      [25, "Critical"],
    ];

    it.each(cases)("maps matrix score %p to %p", (score, expected) => {
      expect(getMatrixScoreLevel(score)).toBe(expected);
    });
  });

  describe("calculateInherentScore", () => {
    it("multiplies likelihood and impact", () => {
      expect(calculateInherentScore(1, 1)).toBe(1);
      expect(calculateInherentScore(5, 5)).toBe(25);
      expect(calculateInherentScore(3, 4)).toBe(12);
    });
  });

  describe("calculateResidualRisk", () => {
    it("returns empty string when inherent risk is empty", () => {
      expect(calculateResidualRisk("", "effective")).toBe("");
    });

    it("applies reduction based on control effectiveness", () => {
      expect(calculateResidualRisk("Critical", "effective")).toBe("High");
      expect(calculateResidualRisk("Critical", "partially_effective")).toBe("Very High");
      expect(calculateResidualRisk("Critical", "ineffective")).toBe("Critical");
    });

    it("handles mixed-case effectiveness values", () => {
      expect(calculateResidualRisk("High", "Partially Effective")).toBeTypeOf("string");
    });
  });

  describe("calculateResidualScore", () => {
    it("applies percentage reductions and enforces minimum of 1", () => {
      expect(calculateResidualScore(25, "effective")).toBe(15);
      expect(calculateResidualScore(25, "partially_effective")).toBe(20);
      expect(calculateResidualScore(25, "ineffective")).toBe(25);
      expect(calculateResidualScore(1, "effective")).toBe(1);
    });
  });

  describe("getRiskLevelColor", () => {
    it("returns a Tailwind class for each level or default", () => {
      expect(getRiskLevelColor("Critical")).toContain("bg-red-");
      expect(getRiskLevelColor("Very High")).toContain("bg-red-");
      expect(getRiskLevelColor("High")).toContain("bg-orange-");
      expect(getRiskLevelColor("Medium")).toContain("bg-amber-");
      expect(getRiskLevelColor("Low")).toContain("bg-green-");
      expect(getRiskLevelColor("")).toContain("bg-gray-");
    });
  });

  describe("getRiskLevelTextColor", () => {
    it("returns a text color class for each level or default", () => {
      expect(getRiskLevelTextColor("Critical")).toContain("text-red-");
      expect(getRiskLevelTextColor("Very High")).toContain("text-red-");
      expect(getRiskLevelTextColor("High")).toContain("text-orange-");
      expect(getRiskLevelTextColor("Medium")).toContain("text-amber-");
      expect(getRiskLevelTextColor("Low")).toContain("text-green-");
      expect(getRiskLevelTextColor("")).toBe("text-gray-900");
    });
  });

  describe("getRiskScore", () => {
    it("returns numeric score for known levels and 0 otherwise", () => {
      expect(getRiskScore("Low")).toBeGreaterThan(0);
      expect(getRiskScore("Medium")).toBeGreaterThan(0);
      expect(getRiskScore("High")).toBeGreaterThan(0);
      expect(getRiskScore("Very High")).toBeGreaterThan(0);
      expect(getRiskScore("Critical")).toBeGreaterThan(0);
      expect(getRiskScore("")).toBe(0);
    });
  });
});
