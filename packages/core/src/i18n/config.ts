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
import enOnboarding from './locales/en/onboarding.json';

// Dutch translations
import nlCommon from './locales/nl/common.json';
import nlOnboarding from './locales/nl/onboarding.json';
import nlDashboard from './locales/nl/dashboard.json';
import nlNavigation from './locales/nl/navigation.json';
import nlTraining from './locales/nl/training.json';
import nlSettings from './locales/nl/settings.json';
import nlCompliance from './locales/nl/compliance.json';
import nlEmployees from './locales/nl/employees.json';
import nlEvidence from './locales/nl/evidence.json';
import nlPolicy from './locales/nl/policy.json';
import nlRisk from './locales/nl/risk.json';
import nlVendors from './locales/nl/vendors.json';

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
        onboarding: enOnboarding,
    },
    nl: {
        common: nlCommon,
        onboarding: nlOnboarding,
        dashboard: nlDashboard,
        navigation: nlNavigation,
        training: nlTraining,
        settings: nlSettings,
        compliance: nlCompliance,
        employees: nlEmployees,
        evidence: nlEvidence,
        policy: nlPolicy,
        risk: nlRisk,
        vendors: nlVendors,
    },
    // Additional languages can be added as locale files are created
    // Example structure for adding new languages:
    // es: {
    //     common: esCommon,
    //     dashboard: esDashboard,
    //     // ...
    // },
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

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: defaultLanguage,
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
            'evidence',
            'onboarding'
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
