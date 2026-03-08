/**
 * Language Switcher Component
 * 
 * A dropdown component for switching between supported languages.
 * Uses the i18n configuration for available languages.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, changeLanguage, getCurrentLanguage, getLanguageByCode } from '@/i18n/config';

/**
 * LanguageSwitcher Component Props
 */
interface LanguageSwitcherProps {
    /** Show full language name instead of just flag */
    showFullName?: boolean;
    /** Position of the dropdown */
    align?: 'start' | 'end' | 'center';
    /** Additional CSS class */
    className?: string;
    /** Callback when language changes */
    onLanguageChange?: (lang: string) => void;
    /** Use compact mode (flag only) */
    compact?: boolean;
}

/**
 * LanguageSwitcher Component
 * 
 * Provides a dropdown to select and change the current language.
 * Shows flags with optional full language names.
 */
export function LanguageSwitcher({
    showFullName = false,
    align = 'end',
    className = '',
    onLanguageChange,
    compact = false
}: LanguageSwitcherProps) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLangCode = getCurrentLanguage();
    const currentLang = getLanguageByCode(currentLangCode);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = async (langCode: string) => {
        await changeLanguage(langCode);
        setIsOpen(false);
        onLanguageChange?.(langCode);
    };

    const getAlignmentClass = () => {
        switch (align) {
            case 'start':
                return 'left-0';
            case 'center':
                return 'left-1/2 -translate-x-1/2';
            case 'end':
            default:
                return 'right-0';
        }
    };

    return (
        <div
            ref={dropdownRef}
            className={`relative ${className}`}
        >
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 
                    bg-background border border-border rounded-md
                    hover:bg-accent hover:text-accent-foreground
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${compact ? 'p-2' : ''}
                `}
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                {/* Flag */}
                <span className="text-lg" role="img" aria-hidden="true">
                    {currentLang?.flag || '🌐'}
                </span>

                {/* Language name (if not compact) */}
                {!compact && (
                    <span className="text-sm font-medium">
                        {currentLang?.nativeName || currentLangCode}
                    </span>
                )}

                {/* Chevron icon */}
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        absolute z-50 mt-1 min-w-[180px]
                        bg-background border border-border rounded-md
                        shadow-lg py-1
                        ${getAlignmentClass()}
                    `}
                    role="listbox"
                >
                    {supportedLanguages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2
                                text-sm text-left
                                hover:bg-accent hover:text-accent-foreground
                                transition-colors duration-150
                                ${currentLangCode === lang.code
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : ''
                                }
                            `}
                            role="option"
                            aria-selected={currentLangCode === lang.code}
                        >
                            {/* Flag */}
                            <span className="text-lg" role="img" aria-hidden="true">
                                {lang.flag}
                            </span>

                            {/* Language name */}
                            <span className="flex-1">
                                {showFullName ? lang.name : lang.nativeName}
                            </span>

                            {/* Check mark for current language */}
                            {currentLangCode === lang.code && (
                                <svg
                                    className="w-4 h-4 text-primary"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Compact Language Switcher (dropdown style with flags only)
 */
export function CompactLanguageSwitcher(props: Omit<LanguageSwitcherProps, 'compact'>) {
    return <LanguageSwitcher {...props} compact />;
}

/**
 * Language Switcher for Settings Page
 * Shows full language names in a list format
 */
export function SettingsLanguageSwitcher({ className }: { className?: string }) {
    const { i18n } = useTranslation();
    const currentLangCode = getCurrentLanguage();

    const handleLanguageChange = async (langCode: string) => {
        await changeLanguage(langCode);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-medium text-foreground">
                Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {supportedLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`
                            flex items-center gap-2 px-3 py-2
                            border rounded-md text-sm
                            transition-all duration-200
                            ${currentLangCode === lang.code
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50 hover:bg-accent'
                            }
                        `}
                    >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="truncate">{lang.nativeName}</span>
                    </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                Select your preferred language. More languages coming soon.
            </p>
        </div>
    );
}

export default LanguageSwitcher;
