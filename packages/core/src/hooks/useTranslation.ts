/**
 * Custom i18n Hook
 * 
 * Provides convenient translation functions with namespace support.
 * This hook wraps react-i18next with additional convenience features.
 */

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { getCurrentLanguage, changeLanguage, supportedLanguages, getLanguageByCode } from '@/i18n/config';

/**
 * Available translation namespaces
 */
export type TranslationNamespace =
    | 'common'
    | 'dashboard'
    | 'navigation'
    | 'compliance'
    | 'risk'
    | 'policy'
    | 'training'
    | 'vendors'
    | 'employees'
    | 'settings'
    | 'evidence';

/**
 * Namespace to use by default when not specified
 */
const DEFAULT_NS = 'common';

/**
 * useTranslation hook with namespace support
 * 
 * Provides:
 * - t: Translation function
 * - language: Current language code
 * - changeLanguage: Function to change language
 * - languages: List of supported languages
 * - isRtl: Whether current language is RTL
 */
export function useTranslation(namespace?: TranslationNamespace) {
    const { t: tOriginal, i18n } = useI18nextTranslation(namespace || DEFAULT_NS);

    const currentLang = i18n.language || getCurrentLanguage() || 'en';
    const langConfig = getLanguageByCode(currentLang);
    const isRtl = langConfig?.dir === 'rtl';

    /**
     * Translate with automatic namespace prefix
     */
    const t = useCallback(
        (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
            const options = typeof optionsOrDefault === 'string'
                ? { defaultValue: optionsOrDefault }
                : optionsOrDefault;

            // If key already contains a colon (e.g. 'dashboard:goodMorning'), use directly
            if (key.includes(':')) {
                return tOriginal(key, options);
            }

            // If key contains a dot with a known namespace (e.g. 'dashboard.goodMorning' or 'common.save')
            const dotIdx = key.indexOf('.');
            if (dotIdx > 0) {
                const prefix = key.slice(0, dotIdx);
                const suffix = key.slice(dotIdx + 1);
                const KNOWN_NS = [
                    'common', 'dashboard', 'navigation', 'compliance',
                    'risk', 'policy', 'training', 'vendors',
                    'employees', 'settings', 'evidence', 'translation'
                ];
                if (KNOWN_NS.includes(prefix)) {
                    return tOriginal(`${prefix}:${suffix}`, options);
                }
            }

            // Otherwise, prepend namespace if provided
            const fullKey = namespace ? `${namespace}:${key}` : key;
            return tOriginal(fullKey, options);
        },
        [tOriginal, namespace]
    );

    /**
     * Translate with explicit namespace
     */
    const tWithNamespace = useCallback(
        (ns: TranslationNamespace, key: string, optionsOrDefault?: Record<string, unknown> | string) => {
            const options = typeof optionsOrDefault === 'string'
                ? { defaultValue: optionsOrDefault }
                : optionsOrDefault;
            return i18n.t(key, { ns, ...options });
        },
        [i18n]
    );

    return {
        t,
        tWithNamespace,
        language: currentLang,
        languages: supportedLanguages,
        isRtl,
        changeLanguage: async (lang: string) => {
            await changeLanguage(lang);
        },
        // Re-export i18n for advanced use
        i18n,
    };
}

/**
 * useLanguage hook for simple language switching
 * 
 * Use this when you only need language switching without translations
 */
export function useLanguage() {
    const { i18n } = useI18nextTranslation();
    const currentLang = i18n.language || getCurrentLanguage() || 'en';
    const langConfig = getLanguageByCode(currentLang);

    return {
        language: currentLang,
        languageConfig: langConfig,
        languages: supportedLanguages,
        isRtl: langConfig?.dir === 'rtl',
        changeLanguage: async (lang: string) => {
            await changeLanguage(lang);
        },
    };
}

/**
 * useAvailableNamespaces hook
 * 
 * Returns all available translation namespaces
 */
export function useAvailableNamespaces() {
    return [
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
    ] as TranslationNamespace[];
}

export default useTranslation;
