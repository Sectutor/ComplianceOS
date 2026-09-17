import { describe, it, expect } from "vitest";
import { getMatrixLevel, getScoreLevel } from "../risk-quant/matrix";

describe("risk-quant matrix", () => {
  it("returns a fallback level for unknown likelihood/impact values", () => {
    const fallbackLikelihood = getMatrixLevel(999, "likelihood");
    const fallbackImpact = getMatrixLevel(999, "impact");

    expect(fallbackLikelihood.value).toBe(3);
    expect(fallbackImpact.value).toBe(3);
  });

  it("scores map to expected qualitative levels", () => {
    expect(getScoreLevel(1).label).toBe("Low");
    expect(getScoreLevel(8).label).toBe("Medium");
    expect(getScoreLevel(12).label).toBe("High");
    expect(getScoreLevel(20).label).toBe("Critical");
  });
});

