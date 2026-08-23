/**
 * i18n Configuration
 * 
 * Multi-language support for ComplianceOS
 * Uses react-i18next for internationalization
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import locale translations
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enNavigation from './locales/en/navigation.json';
import enCompliance from './locales/en/compliance.json';
import enRisk from './locales/en/risk.json';
import enPolicy from './locales/en/policy.json';
import enTraining from './locales/en/training.json';
import enVendors from './locales/en/vendors.json';
import enEmployees from './locales/en/employees.json';
import enSettings from './locales/en/settings.json';
import enEvidence from './locales/en/evidence.json';

// German translations (DE)
import deCommon from './locales/de/common.json';
import deDashboard from './locales/de/dashboard.json';
import deNavigation from './locales/de/navigation.json';
import deCompliance from './locales/de/compliance.json';
import deRisk from './locales/de/risk.json';
import dePolicy from './locales/de/policy.json';
import deTraining from './locales/de/training.json';
import deVendors from './locales/de/vendors.json';
import deEmployees from './locales/de/employees.json';
import deSettings from './locales/de/settings.json';
import deEvidence from './locales/de/evidence.json';

// French translations (FR)
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frNavigation from './locales/fr/navigation.json';
import frCompliance from './locales/fr/compliance.json';
import frRisk from './locales/fr/risk.json';
import frPolicy from './locales/fr/policy.json';
import frTraining from './locales/fr/training.json';
import frVendors from './locales/fr/vendors.json';
import frEmployees from './locales/fr/employees.json';
import frSettings from './locales/fr/settings.json';
import frEvidence from './locales/fr/evidence.json';

// Dutch translations (NL)
import nlCommon from './locales/nl/common.json';
import nlDashboard from './locales/nl/dashboard.json';
import nlNavigation from './locales/nl/navigation.json';
import nlCompliance from './locales/nl/compliance.json';
import nlRisk from './locales/nl/risk.json';
import nlPolicy from './locales/nl/policy.json';
import nlTraining from './locales/nl/training.json';
import nlVendors from './locales/nl/vendors.json';
import nlEmployees from './locales/nl/employees.json';
import nlSettings from './locales/nl/settings.json';
import nlEvidence from './locales/nl/evidence.json';

// Spanish translations (ES)
import esCommon from './locales/es/common.json';
import esDashboard from './locales/es/dashboard.json';
import esNavigation from './locales/es/navigation.json';
import esCompliance from './locales/es/compliance.json';
import esRisk from './locales/es/risk.json';
import esPolicy from './locales/es/policy.json';
import esTraining from './locales/es/training.json';
import esVendors from './locales/es/vendors.json';
import esEmployees from './locales/es/employees.json';
import esSettings from './locales/es/settings.json';
import esEvidence from './locales/es/evidence.json';

// Italian translations (IT)
import itCommon from './locales/it/common.json';
import itDashboard from './locales/it/dashboard.json';
import itNavigation from './locales/it/navigation.json';
import itCompliance from './locales/it/compliance.json';
import itRisk from './locales/it/risk.json';
import itPolicy from './locales/it/policy.json';
import itTraining from './locales/it/training.json';
import itVendors from './locales/it/vendors.json';
import itEmployees from './locales/it/employees.json';
import itSettings from './locales/it/settings.json';
import itEvidence from './locales/it/evidence.json';

// Language resources
const resources = {
    en: {
        common: enCommon,
        dashboard: enDashboard,
        navigation: enNavigation,
        compliance: enCompliance,
        risk: enRisk,
        policy: enPolicy,
        training: enTraining,
        vendors: enVendors,
        employees: enEmployees,
        settings: enSettings,
        evidence: enEvidence,
    },
    de: {
        common: deCommon,
        dashboard: deDashboard,
        navigation: deNavigation,
        compliance: deCompliance,
        risk: deRisk,
        policy: dePolicy,
        training: deTraining,
        vendors: deVendors,
        employees: deEmployees,
        settings: deSettings,
        evidence: deEvidence,
    },
    fr: {
        common: frCommon,
        dashboard: frDashboard,
        navigation: frNavigation,
        compliance: frCompliance,
        risk: frRisk,
        policy: frPolicy,
        training: frTraining,
        vendors: frVendors,
        employees: frEmployees,
        settings: frSettings,
        evidence: frEvidence,
    },
    nl: {
        common: nlCommon,
        dashboard: nlDashboard,
        navigation: nlNavigation,
        compliance: nlCompliance,
        risk: nlRisk,
        policy: nlPolicy,
        training: nlTraining,
        vendors: nlVendors,
        employees: nlEmployees,
        settings: nlSettings,
        evidence: nlEvidence,
    },
    es: {
        common: esCommon,
        dashboard: esDashboard,
        navigation: esNavigation,
        compliance: esCompliance,
        risk: esRisk,
        policy: esPolicy,
        training: esTraining,
        vendors: esVendors,
        employees: esEmployees,
        settings: esSettings,
        evidence: esEvidence,
    },
    it: {
        common: itCommon,
        dashboard: itDashboard,
        navigation: itNavigation,
        compliance: itCompliance,
        risk: itRisk,
        policy: itPolicy,
        training: itTraining,
        vendors: itVendors,
        employees: itEmployees,
        settings: itSettings,
        evidence: itEvidence,
    },
};

// Default language
export const defaultLanguage = 'en';

// Supported languages configuration
export const supportedLanguages = [
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        dir: 'ltr',
        flag: '🇺🇸'
    },
    {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        dir: 'ltr',
        flag: '🇪🇸'
    },
    {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        dir: 'ltr',
        flag: '🇫🇷'
    },
    {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        dir: 'ltr',
        flag: '🇩🇪'
    },
    {
        code: 'nl',
        name: 'Dutch',
        nativeName: 'Nederlands',
        dir: 'ltr',
        flag: '🇳🇱'
    },
    {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        dir: 'ltr',
        flag: '🇧🇷'
    },
    {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        dir: 'ltr',
        flag: '🇯🇵'
    },
    {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        dir: 'ltr',
        flag: '🇨🇳'
    },
    {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        dir: 'rtl',
        flag: '🇸🇦'
    },
    {
        code: 'he',
        name: 'Hebrew',
        nativeName: 'עברית',
        dir: 'rtl',
        flag: '🇮🇱'
    },
];

// Get language direction (ltr/rtl)
export const getLanguageDirection = (lang: string): 'ltr' | 'rtl' => {
    const language = supportedLanguages.find(l => l.code === lang);
    return language?.dir === 'rtl' ? 'rtl' : 'ltr';
};

// Get language by code
export const getLanguageByCode = (code: string) => {
    return supportedLanguages.find(l => l.code === code);
};

// Get all available languages (with at least some translations)
// Currently only English has complete translations
export const getAvailableLanguages = () => {
    // In a real app, you would track which languages have translations
    // For now, return all configured languages
    return supportedLanguages;
};

// Initial language from localStorage if available in browser
export const getInitialLanguage = (): string => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('language');
        if (saved && supportedLanguages.some(l => l.code === saved)) {
            return saved;
        }
    }
    return defaultLanguage;
};

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getInitialLanguage(),
        fallbackLng: defaultLanguage,
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false, // React already safes from XSS
        },

        // React i18next options
        react: {
            useSuspense: false,
        },

        // Namespace configuration - include all available namespaces
        ns: [
            'common',
            'dashboard',
            'navigation',
            'compliance',
            'risk',
            'policy',
            'training',
            'vendors',
            'employees',
            'settings',
            'evidence'
        ],
        defaultNS: 'common',

        // Detection options (can be extended to detect from browser/user)
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'language',
        },
    });

export default i18n;

// Helper function to change language
export const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);

    // Only access localStorage in browser environment (SSR guard)
    if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);

        // Update document direction for RTL languages
        document.documentElement.dir = getLanguageDirection(lang);
        document.documentElement.lang = lang;
    }
};

// Helper to get current language
export const getCurrentLanguage = () => i18n.language;

// Helper translation function with type safety
export const t = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options);

// Export supported languages for use in components
export type SupportedLanguage = typeof supportedLanguages[number];
