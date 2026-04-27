import { describe, it, expect } from "vitest";
import { getPlanLimits, PLAN_LIMITS } from "../planLimits";

describe("planLimits", () => {
  it("returns free limits for unknown tiers", () => {
    expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits(null)).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits("")).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits("starter")).toBe(PLAN_LIMITS.free);
  });

  it("returns pro/enterprise for valid tiers", () => {
    expect(getPlanLimits("pro")).toBe(PLAN_LIMITS.pro);
    expect(getPlanLimits("enterprise")).toBe(PLAN_LIMITS.enterprise);
  });

  it("keeps unlimited limits as Infinity where applicable", () => {
    expect(PLAN_LIMITS.pro.maxClients).toBe(Infinity);
    expect(PLAN_LIMITS.enterprise.maxUsers).toBe(Infinity);
    expect(PLAN_LIMITS.pro.maxPolicies).toBe(Infinity);
  });
});

