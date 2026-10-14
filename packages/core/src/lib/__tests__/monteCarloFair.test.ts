import { describe, it, expect } from "vitest";
import { runFairSimulation, formatCurrency } from "../risk-quant/monteCarloFair";

describe("Open FAIR Monte Carlo Simulation Engine", () => {
  it("should run 5,000 iterations and output realistic percentiles and ALE", () => {
    const result = runFairSimulation({
      scenarioName: "Ransomware on Production Customer Database",
      threatEventFrequency: { min: 1, mode: 3, max: 8 },
      vulnerabilityPercentage: 35, // 35% chance controls fail
      primaryLoss: { min: 50000, mode: 150000, max: 500000 },
      secondaryLoss: { min: 20000, mode: 80000, max: 300000 },
      secondaryLossProbability: 0.5,
      currency: "USD",
      iterations: 5000,
      seed: 42,
    });

    expect(result).toBeDefined();
    expect(result.scenarioName).toBe("Ransomware on Production Customer Database");
    expect(result.iterations).toBe(5000);
    expect(result.aleMean).toBeGreaterThan(0);
    expect(result.p95VaR).toBeGreaterThanOrEqual(result.p50Median);
    expect(result.p50Median).toBeGreaterThanOrEqual(result.p10Loss);
    expect(result.lossExceedanceCurve.length).toBeGreaterThan(5);
    expect(result.histogram.length).toBe(10);
    expect(result.formatted.aleMean).toMatch(/\$\d+(\.\d+)?[KMB]?/);
  });

  it("should format currency correctly", () => {
    expect(formatCurrency(500, "USD")).toBe("$500");
    expect(formatCurrency(45000, "USD")).toBe("$45.0K");
    expect(formatCurrency(1250000, "EUR")).toBe("€1.25M");
    expect(formatCurrency(2500000000, "GBP")).toBe("£2.50B");
  });
});
