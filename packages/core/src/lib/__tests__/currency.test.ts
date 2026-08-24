import { describe, it, expect } from "vitest";
import { formatCurrency, getCurrencySymbol, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from "../currency";

describe("Universal Currency & Localization Utility", () => {
  it("formats standard USD currency amounts", () => {
    const formatted = formatCurrency(14280, "USD", "en-US");
    expect(formatted).toContain("14,280");
    expect(formatted).toContain("$");
  });

  it("formats compact USD amounts (e.g. for VaR metrics)", () => {
    const formatted = formatCurrency(120000, "USD", "en-US", { compact: true });
    expect(formatted).toBe("$120K");
  });

  it("formats compact USD amounts deterministically across magnitudes (no trailing zero)", () => {
    // Regression guard: ICU trailing-zero drift must never reintroduce "$120.0K"-style output.
    expect(formatCurrency(120000, "USD", "en-US", { compact: true })).toBe("$120K");
    expect(formatCurrency(1200000, "USD", "en-US", { compact: true })).toBe("$1.2M");
    expect(formatCurrency(12000000, "USD", "en-US", { compact: true })).toBe("$12M");
  });

  it("formats European EUR amounts with locale", () => {
    const formatted = formatCurrency(14280, "EUR", "de-DE");
    expect(formatted).toContain("14.280");
    expect(formatted).toContain("€");
  });

  it("formats British Pounds with en-GB locale", () => {
    const formatted = formatCurrency(50000, "GBP", "en-GB");
    expect(formatted).toContain("£");
    expect(formatted).toContain("50,000");
  });

  it("formats Japanese Yen without decimal fraction by default", () => {
    const formatted = formatCurrency(1500000, "JPY", "ja-JP");
    expect(formatted).toContain("￥");
    expect(formatted).toContain("1,500,000");
  });

  it("handles null, undefined and invalid amounts gracefully", () => {
    expect(formatCurrency(null, "USD", "en-US")).toBe("$0");
    expect(formatCurrency(undefined, "USD", "en-US")).toBe("$0");
    expect(formatCurrency("invalid", "USD", "en-US")).toBe("$0");
  });

  it("retrieves the correct symbol for global currencies", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("JPY")).toBe("¥");
    expect(getCurrencySymbol("BRL")).toBe("R$");
    expect(getCurrencySymbol("INR")).toBe("₹");
  });

  it("contains complete metadata for supported currencies and locales", () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(20);
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(18);
  });
});
