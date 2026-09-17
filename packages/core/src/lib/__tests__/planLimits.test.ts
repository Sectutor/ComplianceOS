import { describe, it, expect } from "vitest";
import { getPlanLimits, PLAN_LIMITS } from "../planLimits";

describe("planLimits — Two-Tier Structure", () => {
  // ── Tier Names ──────────────────────────────────────────────
  it("has exactly two tiers: consultant and enterprise", () => {
    const tiers = Object.keys(PLAN_LIMITS);
    expect(tiers).toHaveLength(2);
    expect(tiers).toContain("consultant");
    expect(tiers).toContain("enterprise");
  });

  it("does NOT contain legacy tiers (free, starter, pro, guided, mssp)", () => {
    const tiers = Object.keys(PLAN_LIMITS);
    expect(tiers).not.toContain("free");
    expect(tiers).not.toContain("starter");
    expect(tiers).not.toContain("pro");
    expect(tiers).not.toContain("guided");
    expect(tiers).not.toContain("mssp");
  });

  // ── Consultant Tier ─────────────────────────────────────────
  it("consultant tier allows exactly 2 clients", () => {
    expect(PLAN_LIMITS.consultant.maxClients).toBe(2);
  });

  it("consultant tier has unlimited policies", () => {
    expect(PLAN_LIMITS.consultant.maxPolicies).toBe(Infinity);
  });

  it("consultant tier has unlimited users", () => {
    expect(PLAN_LIMITS.consultant.maxUsers).toBe(Infinity);
  });

  it("consultant tier has AI enabled", () => {
    expect(PLAN_LIMITS.consultant.aiEnabled).toBe(true);
  });

  it("consultant tier allows self-hosted", () => {
    expect(PLAN_LIMITS.consultant.allowSelfHosted).toBe(true);
  });

  it("consultant tier has unlimited AI requests per hour", () => {
    expect(PLAN_LIMITS.consultant.aiRequestsPerHour).toBe(Infinity);
  });

  it("consultant tier has unlimited AI requests per day", () => {
    expect(PLAN_LIMITS.consultant.aiRequestsPerDay).toBe(Infinity);
  });

  it("consultant tier has unlimited AI tokens per day", () => {
    expect(PLAN_LIMITS.consultant.aiTokensPerDay).toBe(Infinity);
  });

  it("consultant tier has unlimited AI cost per day", () => {
    expect(PLAN_LIMITS.consultant.aiCostPerDayCents).toBe(Infinity);
  });

  // ── Enterprise Tier ─────────────────────────────────────────
  it("enterprise tier allows unlimited clients", () => {
    expect(PLAN_LIMITS.enterprise.maxClients).toBe(Infinity);
  });

  it("enterprise tier has unlimited policies", () => {
    expect(PLAN_LIMITS.enterprise.maxPolicies).toBe(Infinity);
  });

  it("enterprise tier has unlimited users", () => {
    expect(PLAN_LIMITS.enterprise.maxUsers).toBe(Infinity);
  });

  it("enterprise tier has AI enabled", () => {
    expect(PLAN_LIMITS.enterprise.aiEnabled).toBe(true);
  });

  it("enterprise tier allows self-hosted", () => {
    expect(PLAN_LIMITS.enterprise.allowSelfHosted).toBe(true);
  });

  it("enterprise tier has unlimited AI requests per hour", () => {
    expect(PLAN_LIMITS.enterprise.aiRequestsPerHour).toBe(Infinity);
  });

  it("enterprise tier has unlimited AI requests per day", () => {
    expect(PLAN_LIMITS.enterprise.aiRequestsPerDay).toBe(Infinity);
  });

  it("enterprise tier has unlimited AI tokens per day", () => {
    expect(PLAN_LIMITS.enterprise.aiTokensPerDay).toBe(Infinity);
  });

  it("enterprise tier has unlimited AI cost per day", () => {
    expect(PLAN_LIMITS.enterprise.aiCostPerDayCents).toBe(Infinity);
  });

  // ── getPlanLimits Function ──────────────────────────────────
  it("getPlanLimits returns consultant for undefined", () => {
    expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.consultant);
  });

  it("getPlanLimits returns consultant for null", () => {
    expect(getPlanLimits(null)).toBe(PLAN_LIMITS.consultant);
  });

  it("getPlanLimits returns consultant for empty string", () => {
    expect(getPlanLimits("")).toBe(PLAN_LIMITS.consultant);
  });

  it("getPlanLimits returns consultant for unknown tier names", () => {
    expect(getPlanLimits("free")).toBe(PLAN_LIMITS.consultant);
    expect(getPlanLimits("starter")).toBe(PLAN_LIMITS.consultant);
    expect(getPlanLimits("pro")).toBe(PLAN_LIMITS.consultant);
    expect(getPlanLimits("guided")).toBe(PLAN_LIMITS.consultant);
    expect(getPlanLimits("mssp")).toBe(PLAN_LIMITS.consultant);
    expect(getPlanLimits("random")).toBe(PLAN_LIMITS.consultant);
  });

  it("getPlanLimits returns enterprise for 'enterprise'", () => {
    expect(getPlanLimits("enterprise")).toBe(PLAN_LIMITS.enterprise);
  });

  // ── Cross-tier Comparisons ──────────────────────────────────
  it("enterprise has more or equal clients than consultant", () => {
    expect(PLAN_LIMITS.enterprise.maxClients).toBeGreaterThanOrEqual(
      PLAN_LIMITS.consultant.maxClients
    );
  });

  it("both tiers have the same unlimited policies/users/AI", () => {
    expect(PLAN_LIMITS.consultant.maxPolicies).toBe(PLAN_LIMITS.enterprise.maxPolicies);
    expect(PLAN_LIMITS.consultant.maxUsers).toBe(PLAN_LIMITS.enterprise.maxUsers);
    expect(PLAN_LIMITS.consultant.aiEnabled).toBe(PLAN_LIMITS.enterprise.aiEnabled);
    expect(PLAN_LIMITS.consultant.allowSelfHosted).toBe(PLAN_LIMITS.enterprise.allowSelfHosted);
  });
});
