You are right, manually replacing every string is a huge task. To manage this efficiently, I propose a **phased approach with automation**.

### **Refined Plan: i18n Infrastructure & Automated Workflow**

1.  **Phase 1: Infrastructure Setup (The Foundation)**
    *   Install `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
    *   Create `packages/core/src/i18n.ts` configuration.
    *   Set up the translation folder structure (`locales/en/common.json`, `locales/en/auth.json`, etc.).
    *   Create a `LanguageSwitcher` component.

2.  **Phase 2: Pilot Migration (Proof of Concept)**
    *   I will take **one** page, `LoginPage.tsx` (which I've analyzed and has ~10 hardcoded strings), and fully convert it.
    *   I will extract strings like "Welcome Back", "Sign In", "Email" into a dedicated `auth.json` translation file.
    *   This will serve as a template for the rest of the app.

3.  **Phase 3: Automated Extraction Strategy (The Solution to "Too Many Strings")**
    *   I will install **`i18next-parser`**.
    *   I will configure a script (`npm run extract-i18n`) that scans your entire codebase, finds all usages of `t('key')`, and **automatically populates your JSON files**.
    *   **Workflow for you**: You just replace the text in code with `t('auth.welcome')`, and run the script. You don't need to manually copy-paste text into JSON files.

4.  **Phase 4: Bulk Assistance**
    *   Once the infrastructure is proven, I can help you systematically go through other key sections (like the Dashboard or Reports) in future sessions.

**Shall we start with Phase 1 & 2 (Setup + Login Page Pilot)?**
