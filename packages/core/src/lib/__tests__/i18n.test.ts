import { describe, it, expect, beforeEach } from "vitest";
import i18n, { changeLanguage, getCurrentLanguage, supportedLanguages, getLanguageByCode } from "../../i18n/config";

describe("i18n Multi-Language System", () => {
  beforeEach(async () => {
    await changeLanguage("en");
  });

  it("has all core EU languages configured", () => {
    const codes = supportedLanguages.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("de");
    expect(codes).toContain("fr");
    expect(codes).toContain("nl");
    expect(codes).toContain("es");
  });

  it("translates navigation in English", () => {
    expect(i18n.t("navigation:dashboard")).toBe("Dashboard");
    expect(i18n.t("navigation:compliance")).toBe("Compliance");
    expect(i18n.t("navigation:risks")).toBe("Risk Management");
  });

  it("switches to German (DE) and translates statutory compliance terms", async () => {
    await changeLanguage("de");
    expect(getCurrentLanguage()).toBe("de");
    expect(i18n.t("navigation:dashboard")).toBe("Übersicht");
    expect(i18n.t("navigation:controls")).toBe("Kontrollen");
    expect(i18n.t("navigation:policies")).toBe("Richtlinien");
    expect(i18n.t("navigation:risks")).toBe("Risikomanagement");
    expect(i18n.t("navigation:vendors")).toBe("Lieferanten & Dritte");
  });

  it("switches to French (FR) and translates statutory compliance terms", async () => {
    await changeLanguage("fr");
    expect(getCurrentLanguage()).toBe("fr");
    expect(i18n.t("navigation:dashboard")).toBe("Tableau de bord");
    expect(i18n.t("navigation:compliance")).toBe("Conformité");
    expect(i18n.t("navigation:controls")).toBe("Contrôles");
    expect(i18n.t("navigation:risks")).toBe("Gestion des Risques");
    expect(i18n.t("navigation:vendors")).toBe("Fournisseurs & Tiers");
  });

  it("switches to Dutch (NL) and translates statutory compliance terms", async () => {
    await changeLanguage("nl");
    expect(getCurrentLanguage()).toBe("nl");
    expect(i18n.t("navigation:controls")).toBe("Beheersmaatregelen");
    expect(i18n.t("navigation:policies")).toBe("Beleid");
    expect(i18n.t("navigation:risks")).toBe("Risicobeheer");
    expect(i18n.t("navigation:vendors")).toBe("Leveranciers & Derden");
    expect(i18n.t("dashboard:goodMorning")).toBe("Goedemorgen");
    expect(i18n.t("dashboard:livePostureScore")).toBe("Actuele Compliancescore");
    expect(i18n.t("dashboard:commandInterface")).toBe("Bedieningsinterface");
    expect(i18n.t("dashboard:governanceHealth")).toBe("Governance Gezondheid");
  });

  it("switches to Spanish (ES) and translates statutory compliance terms", async () => {
    await changeLanguage("es");
    expect(getCurrentLanguage()).toBe("es");
    expect(i18n.t("navigation:dashboard")).toBe("Panel");
    expect(i18n.t("navigation:compliance")).toBe("Cumplimiento");
    expect(i18n.t("navigation:risks")).toBe("Gestión de Riesgos");
  });

  it("provides correct language metadata via getLanguageByCode", () => {
    const deMeta = getLanguageByCode("de");
    expect(deMeta?.name).toBe("German");
    expect(deMeta?.nativeName).toBe("Deutsch");
    expect(deMeta?.flag).toBe("🇩🇪");
  });
});
